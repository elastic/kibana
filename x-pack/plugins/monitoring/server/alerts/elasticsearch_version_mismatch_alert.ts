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
  AlertInstanceState,
  LegacyAlert,
} from './types';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_ALERTS,
  ALERT_ELASTICSEARCH_VERSION_MISMATCH,
  ALERT_ACTION_TYPE_EMAIL,
  ALERT_ACTION_TYPE_LOG,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertSeverity } from '../../common/enums';
import { CommonAlertParams } from '../../common/types';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';

const WATCH_NAME = 'elasticsearch_version_mismatch';
const RESOLVED = i18n.translate('xpack.monitoring.alerts.elasticsearchVersionMismatch.resolved', {
  defaultMessage: 'resolved',
});
const FIRING = i18n.translate('xpack.monitoring.alerts.elasticsearchVersionMismatch.firing', {
  defaultMessage: 'firing',
});

export class ElasticsearchVersionMismatchAlert extends BaseAlert {
  public type = ALERT_ELASTICSEARCH_VERSION_MISMATCH;
  public label = 'Elasticsearch version mismatch';
  public isLegacy = true;

  protected actionVariables = [
    { name: 'state', description: 'The current state of the alert.' },
    { name: 'clusterName', description: 'The name of the cluster to which the nodes belong.' },
    { name: 'versionList', description: 'The list of unique versions.' },
  ];

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let alertIndexPattern = INDEX_ALERTS;
    if (availableCcs) {
      alertIndexPattern = getCcsIndexPattern(alertIndexPattern, availableCcs);
    }

    const legacyAlerts = await fetchLegacyAlerts(
      callCluster,
      clusters,
      alertIndexPattern,
      WATCH_NAME,
      this.config.ui.max_bucket_size
    );

    return legacyAlerts.reduce((accum: AlertData[], legacyAlert) => {
      const severity = AlertSeverity.Warning;

      accum.push({
        instanceKey: `${legacyAlert.metadata.cluster_uuid}`,
        clusterUuid: legacyAlert.metadata.cluster_uuid,
        shouldFire: !legacyAlert.resolved_timestamp,
        severity,
        meta: legacyAlert,
        ccs: null,
      });
      return accum;
    }, []);
  }

  private getVersions(legacyAlert: LegacyAlert) {
    const prefixStr = 'Versions: ';
    return legacyAlert.message.slice(
      legacyAlert.message.indexOf(prefixStr) + prefixStr.length,
      legacyAlert.message.length - 1
    );
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const legacyAlert = item.meta as LegacyAlert;
    const versions = this.getVersions(legacyAlert);
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
        defaultMessage: `There are different versions of Elasticsearch {versions} running in this cluster.`,
        values: {
          versions,
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
    const legacyAlert = item.meta as LegacyAlert;
    const versions = this.getVersions(legacyAlert);
    if (!alertState.ui.isFiring) {
      instance.scheduleActions('default', {
        state: RESOLVED,
        clusterName: cluster.clusterName,
      });
    } else {
      instance.scheduleActions('default', {
        state: FIRING,
        clusterName: cluster.clusterName,
        versionList: versions,
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
              defaultMessage: `Elasticsearch version mismatch alert is {state} for {clusterName}`,
              values: {
                state: '{{context.state}}',
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
              defaultMessage: `Elasticsearch version mismatch alert is {state} for {clusterName}`,
              values: {
                state: '{{context.state}}',
                clusterName: '{{context.clusterName}}',
              },
            }
          ),
        };
    }
    return null;
  }
}
