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
  CommonAlertParams,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_ALERTS,
  ALERT_ELASTICSEARCH_VERSION_MISMATCH,
  LEGACY_ALERT_DETAILS,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertSeverity } from '../../common/enums';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
import { AlertingDefaults } from './alert_helpers';

const WATCH_NAME = 'elasticsearch_version_mismatch';

export class ElasticsearchVersionMismatchAlert extends BaseAlert {
  public type = ALERT_ELASTICSEARCH_VERSION_MISMATCH;
  public label = LEGACY_ALERT_DETAILS[ALERT_ELASTICSEARCH_VERSION_MISMATCH].label;
  public description = LEGACY_ALERT_DETAILS[ALERT_ELASTICSEARCH_VERSION_MISMATCH].description;
  public isLegacy = true;

  protected actionVariables = [
    {
      name: 'versionList',
      description: i18n.translate(
        'xpack.monitoring.alerts.elasticsearchVersionMismatch.actionVariables.clusterHealth',
        {
          defaultMessage: 'The versions of Elasticsearch running in this cluster.',
        }
      ),
    },
    ...Object.values(AlertingDefaults.ALERT_TYPE.context),
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
            defaultMessage: `All versions of Elasticsearch are the same in this cluster.`,
          }
        ),
      };
    }

    const text = i18n.translate(
      'xpack.monitoring.alerts.elasticsearchVersionMismatch.ui.firingMessage',
      {
        defaultMessage: `Multiple versions of Elasticsearch ({versions}) running in this cluster.`,
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
        internalShortMessage: i18n.translate(
          'xpack.monitoring.alerts.elasticsearchVersionMismatch.resolved.internalShortMessage',
          {
            defaultMessage: `Elasticsearch version mismatch alert is resolved for {clusterName}.`,
            values: {
              clusterName: cluster.clusterName,
            },
          }
        ),
        internalFullMessage: i18n.translate(
          'xpack.monitoring.alerts.elasticsearchVersionMismatch.resolved.internalFullMessage',
          {
            defaultMessage: `Elasticsearch version mismatch alert is resolved for {clusterName}.`,
            values: {
              clusterName: cluster.clusterName,
            },
          }
        ),
        state: AlertingDefaults.ALERT_STATE.resolved,
        clusterName: cluster.clusterName,
      });
    } else {
      const shortActionText = i18n.translate(
        'xpack.monitoring.alerts.elasticsearchVersionMismatch.shortAction',
        {
          defaultMessage: 'Verify you have the same version across all nodes.',
        }
      );
      const fullActionText = i18n.translate(
        'xpack.monitoring.alerts.elasticsearchVersionMismatch.fullAction',
        {
          defaultMessage: 'View nodes',
        }
      );
      const action = `[${fullActionText}](elasticsearch/nodes)`;
      instance.scheduleActions('default', {
        internalShortMessage: i18n.translate(
          'xpack.monitoring.alerts.elasticsearchVersionMismatch.firing.internalShortMessage',
          {
            defaultMessage: `Elasticsearch version mismatch alert is firing for {clusterName}. {shortActionText}`,
            values: {
              clusterName: cluster.clusterName,
              shortActionText,
            },
          }
        ),
        internalFullMessage: i18n.translate(
          'xpack.monitoring.alerts.elasticsearchVersionMismatch.firing.internalFullMessage',
          {
            defaultMessage: `Elasticsearch version mismatch alert is firing for {clusterName}. Elasticsearch is running {versions}. {action}`,
            values: {
              clusterName: cluster.clusterName,
              versions,
              action,
            },
          }
        ),
        state: AlertingDefaults.ALERT_STATE.firing,
        clusterName: cluster.clusterName,
        versionList: versions,
        action,
        actionPlain: shortActionText,
      });
    }
  }
}
