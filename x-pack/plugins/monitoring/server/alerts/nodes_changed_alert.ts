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
  LegacyAlertNodesChangedList,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerts/server';
import { ALERT_NODES_CHANGED, LEGACY_ALERT_DETAILS } from '../../common/constants';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerts/common';

export class NodesChangedAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_NODES_CHANGED,
      name: LEGACY_ALERT_DETAILS[ALERT_NODES_CHANGED].label,
      legacy: {
        watchName: 'elasticsearch_nodes',
        changeDataValues: { shouldFire: true },
      },
      actionVariables: [
        {
          name: 'added',
          description: i18n.translate(
            'xpack.monitoring.alerts.nodesChanged.actionVariables.added',
            {
              defaultMessage: 'The list of nodes added to the cluster.',
            }
          ),
        },
        {
          name: 'removed',
          description: i18n.translate(
            'xpack.monitoring.alerts.nodesChanged.actionVariables.removed',
            {
              defaultMessage: 'The list of nodes removed from the cluster.',
            }
          ),
        },
        {
          name: 'restarted',
          description: i18n.translate(
            'xpack.monitoring.alerts.nodesChanged.actionVariables.restarted',
            {
              defaultMessage: 'The list of nodes restarted in the cluster.',
            }
          ),
        },
        ...Object.values(AlertingDefaults.ALERT_TYPE.context),
      ],
    });
  }

  private getNodeStates(legacyAlert: LegacyAlert): LegacyAlertNodesChangedList {
    return legacyAlert.nodes || { added: {}, removed: {}, restarted: {} };
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const legacyAlert = item.meta as LegacyAlert;
    const states = this.getNodeStates(legacyAlert);
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.resolvedMessage', {
          defaultMessage: `No changes in Elasticsearch nodes for this cluster.`,
        }),
      };
    }

    if (
      Object.values(states.added).length === 0 &&
      Object.values(states.removed).length === 0 &&
      Object.values(states.restarted).length === 0
    ) {
      return {
        text: i18n.translate(
          'xpack.monitoring.alerts.nodesChanged.ui.nothingDetectedFiringMessage',
          {
            defaultMessage: `Elasticsearch nodes have changed`,
          }
        ),
      };
    }

    const addedText =
      Object.values(states.added).length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.addedFiringMessage', {
            defaultMessage: `Elasticsearch nodes '{added}' added to this cluster.`,
            values: {
              added: Object.values(states.added).join(','),
            },
          })
        : null;
    const removedText =
      Object.values(states.removed).length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.removedFiringMessage', {
            defaultMessage: `Elasticsearch nodes '{removed}' removed from this cluster.`,
            values: {
              removed: Object.values(states.removed).join(','),
            },
          })
        : null;
    const restartedText =
      Object.values(states.restarted).length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.restartedFiringMessage', {
            defaultMessage: `Elasticsearch nodes '{restarted}' restarted in this cluster.`,
            values: {
              restarted: Object.values(states.restarted).join(','),
            },
          })
        : null;

    return {
      text: [addedText, removedText, restartedText].filter(Boolean).join(' '),
    };
  }

  protected async executeActions(
    instance: AlertInstance,
    alertState: AlertState,
    item: AlertData,
    cluster: AlertCluster
  ) {
    const legacyAlert = item.meta as LegacyAlert;
    if (alertState.ui.isFiring) {
      const shortActionText = i18n.translate('xpack.monitoring.alerts.nodesChanged.shortAction', {
        defaultMessage: 'Verify that you added, removed, or restarted nodes.',
      });
      const fullActionText = i18n.translate('xpack.monitoring.alerts.nodesChanged.fullAction', {
        defaultMessage: 'View nodes',
      });
      const action = `[${fullActionText}](elasticsearch/nodes)`;
      const states = this.getNodeStates(legacyAlert);
      const added = Object.values(states.added).join(',');
      const removed = Object.values(states.removed).join(',');
      const restarted = Object.values(states.restarted).join(',');
      instance.scheduleActions('default', {
        internalShortMessage: i18n.translate(
          'xpack.monitoring.alerts.nodesChanged.firing.internalShortMessage',
          {
            defaultMessage: `Nodes changed alert is firing for {clusterName}. {shortActionText}`,
            values: {
              clusterName: cluster.clusterName,
              shortActionText,
            },
          }
        ),
        internalFullMessage: i18n.translate(
          'xpack.monitoring.alerts.nodesChanged.firing.internalFullMessage',
          {
            defaultMessage: `Nodes changed alert is firing for {clusterName}. The following Elasticsearch nodes have been added:{added} removed:{removed} restarted:{restarted}. {action}`,
            values: {
              clusterName: cluster.clusterName,
              added,
              removed,
              restarted,
              action,
            },
          }
        ),
        state: AlertingDefaults.ALERT_STATE.firing,
        clusterName: cluster.clusterName,
        added,
        removed,
        restarted,
        action,
        actionPlain: shortActionText,
      });
    }
  }
}
