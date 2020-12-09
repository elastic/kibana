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
  LegacyAlert,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerts/server';
import { ALERT_KIBANA_VERSION_MISMATCH, LEGACY_ALERT_DETAILS } from '../../common/constants';
import { AlertSeverity } from '../../common/enums';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerts/common';

export class KibanaVersionMismatchAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_KIBANA_VERSION_MISMATCH,
      name: LEGACY_ALERT_DETAILS[ALERT_KIBANA_VERSION_MISMATCH].label,
      legacy: {
        watchName: 'kibana_version_mismatch',
        changeDataValues: { severity: AlertSeverity.Warning },
      },
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

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const legacyAlert = item.meta as LegacyAlert;
    const versions = this.getVersions(legacyAlert);
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
    alertState: AlertState,
    item: AlertData,
    cluster: AlertCluster
  ) {
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
