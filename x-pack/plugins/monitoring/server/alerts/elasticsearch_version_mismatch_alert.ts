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
import { ALERT_ELASTICSEARCH_VERSION_MISMATCH, LEGACY_ALERT_DETAILS } from '../../common/constants';
import { AlertSeverity } from '../../common/enums';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerts/common';

export class ElasticsearchVersionMismatchAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_ELASTICSEARCH_VERSION_MISMATCH,
      name: LEGACY_ALERT_DETAILS[ALERT_ELASTICSEARCH_VERSION_MISMATCH].label,
      legacy: {
        watchName: 'elasticsearch_version_mismatch',
        changeDataValues: { severity: AlertSeverity.Warning },
      },
      interval: '1d',
      actionVariables: [
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
      ],
    });
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const legacyAlert = item.meta as LegacyAlert;
    const versions = this.getVersions(legacyAlert);
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
    alertState: AlertState,
    item: AlertData,
    cluster: AlertCluster
  ) {
    const legacyAlert = item.meta as LegacyAlert;
    const versions = this.getVersions(legacyAlert);
    if (alertState.ui.isFiring) {
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
