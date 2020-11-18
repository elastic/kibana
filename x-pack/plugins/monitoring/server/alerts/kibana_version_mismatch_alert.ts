/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  ALERT_KIBANA_VERSION_MISMATCH,
  LEGACY_ALERT_DETAILS,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertSeverity } from '../../common/enums';
import { fetchLegacyAlerts } from '../lib/alerts/fetch_legacy_alerts';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerts/common';
import { Globals } from '../static_globals';

const WATCH_NAME = 'kibana_version_mismatch';

export class KibanaVersionMismatchAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_KIBANA_VERSION_MISMATCH,
      name: LEGACY_ALERT_DETAILS[ALERT_KIBANA_VERSION_MISMATCH].label,
      isLegacy: true,
      interval: '1d',
      actionVariables: [
        {
          name: 'versionList',
          description: i18n.translate(
            'xpack.monitoring.alerts.kibanaVersionMismatch.actionVariables.clusterHealth',
            {
              defaultMessage: 'The versions of Kibana running in this cluster.',
            }
          ),
        },
        {
          name: 'clusterName',
          description: i18n.translate(
            'xpack.monitoring.alerts.kibanaVersionMismatch.actionVariables.clusterName',
            {
              defaultMessage: 'The cluster to which the instances belong.',
            }
          ),
        },
        AlertingDefaults.ALERT_TYPE.context.internalShortMessage,
        AlertingDefaults.ALERT_TYPE.context.internalFullMessage,
        AlertingDefaults.ALERT_TYPE.context.state,
        AlertingDefaults.ALERT_TYPE.context.action,
        AlertingDefaults.ALERT_TYPE.context.actionPlain,
      ],
    });
  }

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
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
      Globals.app.config.ui.max_bucket_size
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
        text: i18n.translate('xpack.monitoring.alerts.kibanaVersionMismatch.ui.resolvedMessage', {
          defaultMessage: `All versions of Kibana are the same in this cluster.`,
        }),
      };
    }

    const text = i18n.translate('xpack.monitoring.alerts.kibanaVersionMismatch.ui.firingMessage', {
      defaultMessage: `Multiple versions of Kibana ({versions}) running in this cluster.`,
      values: {
        versions,
      },
    });

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
    if (alertState.ui.isFiring) {
      const shortActionText = i18n.translate(
        'xpack.monitoring.alerts.kibanaVersionMismatch.shortAction',
        {
          defaultMessage: 'Verify you have the same version across all instances.',
        }
      );
      const fullActionText = i18n.translate(
        'xpack.monitoring.alerts.kibanaVersionMismatch.fullAction',
        {
          defaultMessage: 'View instances',
        }
      );
      const action = `[${fullActionText}](kibana/instances)`;
      instance.scheduleActions('default', {
        internalShortMessage: i18n.translate(
          'xpack.monitoring.alerts.kibanaVersionMismatch.firing.internalShortMessage',
          {
            defaultMessage: `Kibana version mismatch alert is firing for {clusterName}. {shortActionText}`,
            values: {
              clusterName: cluster.clusterName,
              shortActionText,
            },
          }
        ),
        internalFullMessage: i18n.translate(
          'xpack.monitoring.alerts.kibanaVersionMismatch.firing.internalFullMessage',
          {
            defaultMessage: `Kibana version mismatch alert is firing for {clusterName}. Kibana is running {versions}. {action}`,
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
