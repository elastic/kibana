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
  AlertMessageLinkToken,
  LegacyAlert,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerts/server';
import { ALERT_CLUSTER_HEALTH, LEGACY_ALERT_DETAILS } from '../../common/constants';
import { AlertMessageTokenType, AlertClusterHealthType } from '../../common/enums';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerts/common';

const RED_STATUS_MESSAGE = i18n.translate('xpack.monitoring.alerts.clusterHealth.redMessage', {
  defaultMessage: 'Allocate missing primary and replica shards',
});

const YELLOW_STATUS_MESSAGE = i18n.translate(
  'xpack.monitoring.alerts.clusterHealth.yellowMessage',
  {
    defaultMessage: 'Allocate missing replica shards',
  }
);

export class ClusterHealthAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_CLUSTER_HEALTH,
      name: LEGACY_ALERT_DETAILS[ALERT_CLUSTER_HEALTH].label,
      legacy: {
        watchName: 'elasticsearch_cluster_status',
      },
      actionVariables: [
        {
          name: 'clusterHealth',
          description: i18n.translate(
            'xpack.monitoring.alerts.clusterHealth.actionVariables.clusterHealth',
            {
              defaultMessage: 'The health of the cluster.',
            }
          ),
        },
        ...Object.values(AlertingDefaults.ALERT_TYPE.context),
      ],
    });
  }

  private getHealth(legacyAlert: LegacyAlert) {
    return legacyAlert.prefix
      .replace('Elasticsearch cluster status is ', '')
      .slice(0, -1) as AlertClusterHealthType;
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const legacyAlert = item.meta as LegacyAlert;
    const health = this.getHealth(legacyAlert);
    return {
      text: i18n.translate('xpack.monitoring.alerts.clusterHealth.ui.firingMessage', {
        defaultMessage: `Elasticsearch cluster health is {health}.`,
        values: {
          health,
        },
      }),
      nextSteps: [
        {
          text: i18n.translate('xpack.monitoring.alerts.clusterHealth.ui.nextSteps.message1', {
            defaultMessage: `{message}. #start_linkView now#end_link`,
            values: {
              message:
                health === AlertClusterHealthType.Red ? RED_STATUS_MESSAGE : YELLOW_STATUS_MESSAGE,
            },
          }),
          tokens: [
            {
              startToken: '#start_link',
              endToken: '#end_link',
              type: AlertMessageTokenType.Link,
              url: 'elasticsearch/indices',
            } as AlertMessageLinkToken,
          ],
        },
      ],
    };
  }

  protected async executeActions(
    instance: AlertInstance,
    alertState: AlertState,
    item: AlertData,
    cluster: AlertCluster
  ) {
    const legacyAlert = item.meta as LegacyAlert;
    const health = this.getHealth(legacyAlert);
    if (alertState.ui.isFiring) {
      const actionText =
        health === AlertClusterHealthType.Red
          ? i18n.translate('xpack.monitoring.alerts.clusterHealth.action.danger', {
              defaultMessage: `Allocate missing primary and replica shards.`,
            })
          : i18n.translate('xpack.monitoring.alerts.clusterHealth.action.warning', {
              defaultMessage: `Allocate missing replica shards.`,
            });

      const action = `[${actionText}](elasticsearch/indices)`;
      instance.scheduleActions('default', {
        internalShortMessage: i18n.translate(
          'xpack.monitoring.alerts.clusterHealth.firing.internalShortMessage',
          {
            defaultMessage: `Cluster health alert is firing for {clusterName}. Current health is {health}. {actionText}`,
            values: {
              clusterName: cluster.clusterName,
              health,
              actionText,
            },
          }
        ),
        internalFullMessage: i18n.translate(
          'xpack.monitoring.alerts.clusterHealth.firing.internalFullMessage',
          {
            defaultMessage: `Cluster health alert is firing for {clusterName}. Current health is {health}. {action}`,
            values: {
              clusterName: cluster.clusterName,
              health,
              action,
            },
          }
        ),
        state: AlertingDefaults.ALERT_STATE.firing,
        clusterHealth: health,
        clusterName: cluster.clusterName,
        action,
        actionPlain: actionText,
      });
    }
  }
}
