/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IUiSettingsClient } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertVersionMismatchState,
  AlertInstanceState,
  AlertVersions,
} from './types';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_ALERTS,
  ALERT_ELASTICSEARCH_VERSION_MISMATCH,
  ALERT_ACTION_TYPE_EMAIL,
  ALERT_ACTION_TYPE_LOG,
  INDEX_PATTERN_ELASTICSEARCH,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertSeverity } from '../../common/enums';
import { CommonAlertParams } from '../../common/types';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
import { fetchElasticsearchVersions } from '../lib/alerts/fetch_elasticsearch_versions';

const WATCH_NAME = 'elasticsearch_version_mismatch';

export class ElasticsearchVersionMismatchAlert extends BaseAlert {
  public type = ALERT_ELASTICSEARCH_VERSION_MISMATCH;
  public label = 'Elasticsearch version mismatch';
  public isLegacy = true;

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    const logger = this.getLogger(this.type);
    let alertIndexPattern = INDEX_ALERTS;
    if (availableCcs) {
      alertIndexPattern = getCcsIndexPattern(alertIndexPattern, availableCcs);
    }
    let elasticsearchIndexPattern = INDEX_PATTERN_ELASTICSEARCH;
    if (availableCcs) {
      elasticsearchIndexPattern = getCcsIndexPattern(elasticsearchIndexPattern, availableCcs);
    }
    const [elasticsearchVersions, legacyAlerts] = await Promise.all([
      await fetchElasticsearchVersions(
        callCluster,
        clusters,
        elasticsearchIndexPattern,
        this.config.ui.max_bucket_size
      ),
      await fetchLegacyAlerts(callCluster, clusters, alertIndexPattern, WATCH_NAME),
    ]);
    return legacyAlerts.reduce((accum: AlertData[], legacyAlert) => {
      const versions = elasticsearchVersions.find(
        ({ clusterUuid }) => clusterUuid === legacyAlert.metadata.cluster_uuid
      );
      if (!versions) {
        // This is potentially bad
        logger.warn(
          `Unable to map legacy alert status to elasticsearch version for ${legacyAlert.metadata.cluster_uuid}. No alert will show in the UI but it is assumed the alert has been resolved.`
        );
        return accum;
      }

      const shouldFire = versions.versions.length > 0;
      const severity = AlertSeverity.Warning;

      accum.push({
        instanceKey: `${versions.clusterUuid}`,
        clusterUuid: versions.clusterUuid,
        shouldFire,
        severity,
        meta: versions,
        ccs: versions.ccs,
      });
      return accum;
    }, []);
  }

  protected getDefaultAlertState(
    cluster: AlertCluster,
    item: AlertData
  ): AlertVersionMismatchState {
    const versions = item.meta as AlertVersions;
    return {
      cluster,
      ccs: null,
      versions,
      ui: {
        isFiring: false,
        message: null,
        severity: AlertSeverity.Success,
        resolvedMS: 0,
        triggeredMS: 0,
        lastCheckedMS: 0,
      },
    };
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const versions = item.meta as AlertVersions;
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate(
          'xpack.monitoring.alerts.elasticsearchVersionMismatch.ui.resolvedMessage',
          {
            defaultMessage: `All versions are the same for Elasticsearch in this cluster.`,
          }
        ),
      };
    }

    const text = i18n.translate(
      'xpack.monitoring.alerts.elasticsearchVersionMismatch.ui.firingMessage',
      {
        defaultMessage: `There are different versions of Elasticsearch ({versions}) running in this cluster.`,
        values: {
          versions: versions.versions.join(','),
        },
      }
    );

    return {
      text,
    };
  }

  protected async executeActions(
    instance: AlertInstance,
    instanceState: AlertInstanceState,
    item: AlertData,
    cluster: AlertCluster
  ) {
    if (instanceState.alertStates.length === 0) {
      return;
    }
    const alertState = instanceState.alertStates[0];
    const versions = item.meta as AlertVersions;
    if (!alertState.ui.isFiring) {
      instance.scheduleActions('default', {
        clusterName: cluster.clusterName,
      });
    } else {
      instance.scheduleActions('default', {
        clusterName: cluster.clusterName,
        versionList: versions.versions.join(','),
      });
    }
  }

  public getDefaultActionParams(actionTypeId: string) {
    switch (actionTypeId) {
      case ALERT_ACTION_TYPE_EMAIL:
        return {
          subject: i18n.translate(
            'xpack.monitoring.alerts.elasticsearchVersionMismatch.emailSubject',
            {
              defaultMessage: `Different versions of Elasticsearch detected in {clusterName}`,
              values: {
                clusterName: '{{context.clusterName}}',
              },
            }
          ),
          message: i18n.translate(
            'xpack.monitoring.alerts.elasticsearchVersionMismatch.emailMessage',
            {
              defaultMessage: `Elasticsearch is running {versionList} in {clusterName}.`,
              values: {
                versionList: '{{context.versionList}}',
                clusterName: '{{context.clusterName}}',
              },
            }
          ),
        };
      case ALERT_ACTION_TYPE_LOG:
        return {
          message: i18n.translate(
            'xpack.monitoring.alerts.elasticsearchVersionMismatch.serverLog',
            {
              defaultMessage: `Different versions of Elasticsearch detected in {clusterName}`,
              values: {
                clusterName: '{{context.clusterName}}',
              },
            }
          ),
        };
    }
    return null;
  }
}
