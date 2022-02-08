/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from 'kibana/server';
import { BaseRule } from './base_rule';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertClusterStatsNodes,
  AlertClusterStatsNode,
  CommonAlertParams,
  AlertInstanceState,
  AlertNodesChangedState,
} from '../../common/types/alerts';
import { Alert } from '../../../alerting/server';
import { RULE_NODES_CHANGED, LEGACY_RULE_DETAILS } from '../../common/constants';
import { AlertingDefaults } from './alert_helpers';
import { SanitizedAlert } from '../../../alerting/common';
import { fetchNodesFromClusterStats } from '../lib/alerts/fetch_nodes_from_cluster_stats';
import { AlertSeverity } from '../../common/enums';
interface AlertNodesChangedStates {
  removed: AlertClusterStatsNode[];
  added: AlertClusterStatsNode[];
  restarted: AlertClusterStatsNode[];
}

function getNodeStates(nodes: AlertClusterStatsNodes): AlertNodesChangedStates {
  const removed = nodes.priorNodes.filter(
    (priorNode) =>
      !nodes.recentNodes.find((recentNode) => priorNode.nodeUuid === recentNode.nodeUuid)
  );
  const added = nodes.recentNodes.filter(
    (recentNode) =>
      !nodes.priorNodes.find((priorNode) => priorNode.nodeUuid === recentNode.nodeUuid)
  );
  const restarted = nodes.recentNodes.filter(
    (recentNode) =>
      nodes.priorNodes.find((priorNode) => priorNode.nodeUuid === recentNode.nodeUuid) &&
      !nodes.priorNodes.find(
        (priorNode) => priorNode.nodeEphemeralId === recentNode.nodeEphemeralId
      )
  );

  return {
    removed,
    added,
    restarted,
  };
}

export class NodesChangedRule extends BaseRule {
  constructor(public sanitizedRule?: SanitizedAlert) {
    super(sanitizedRule, {
      id: RULE_NODES_CHANGED,
      name: LEGACY_RULE_DETAILS[RULE_NODES_CHANGED].label,
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

  protected async fetchData(
    params: CommonAlertParams,
    esClient: ElasticsearchClient,
    clusters: AlertCluster[]
  ): Promise<AlertData[]> {
    const nodesFromClusterStats = await fetchNodesFromClusterStats(
      esClient,
      clusters,
      params.filterQuery
    );
    return nodesFromClusterStats.map((nodes) => {
      const { removed, added, restarted } = getNodeStates(nodes);
      const shouldFire = removed.length > 0 || added.length > 0 || restarted.length > 0;
      const severity = AlertSeverity.Warning;

      return {
        shouldFire,
        severity,
        meta: nodes,
        clusterUuid: nodes.clusterUuid,
        ccs: nodes.ccs,
      };
    });
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const nodes = item.meta as AlertClusterStatsNodes;
    const states = getNodeStates(nodes);
    if (!alertState.ui.isFiring) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.resolvedMessage', {
          defaultMessage: `No changes in Elasticsearch nodes for this cluster.`,
        }),
      };
    }

    if (states.added.length === 0 && states.removed.length === 0 && states.restarted.length === 0) {
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
      states.added.length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.addedFiringMessage', {
            defaultMessage: `Elasticsearch nodes '{added}' added to this cluster.`,
            values: {
              added: states.added.map((n) => n.nodeName).join(','),
            },
          })
        : null;
    const removedText =
      states.removed.length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.removedFiringMessage', {
            defaultMessage: `Elasticsearch nodes '{removed}' removed from this cluster.`,
            values: {
              removed: states.removed.map((n) => n.nodeName).join(','),
            },
          })
        : null;
    const restartedText =
      states.restarted.length > 0
        ? i18n.translate('xpack.monitoring.alerts.nodesChanged.ui.restartedFiringMessage', {
            defaultMessage: `Elasticsearch nodes '{restarted}' restarted in this cluster.`,
            values: {
              restarted: states.restarted.map((n) => n.nodeName).join(','),
            },
          })
        : null;

    return {
      text: [addedText, removedText, restartedText].filter(Boolean).join(' '),
    };
  }

  protected async executeActions(
    instance: Alert,
    { alertStates }: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    if (alertStates.length === 0) {
      return;
    }

    // Logic in the base alert assumes that all alerts will operate against multiple nodes/instances (such as a CPU alert against ES nodes)
    // However, some alerts operate on the state of the cluster itself and are only concerned with a single state
    const state = alertStates[0] as AlertNodesChangedState;
    const nodes = state.meta as AlertClusterStatsNodes;
    const shortActionText = i18n.translate('xpack.monitoring.alerts.nodesChanged.shortAction', {
      defaultMessage: 'Verify that you added, removed, or restarted nodes.',
    });
    const fullActionText = i18n.translate('xpack.monitoring.alerts.nodesChanged.fullAction', {
      defaultMessage: 'View nodes',
    });
    const action = `[${fullActionText}](elasticsearch/nodes)`;
    const states = getNodeStates(nodes);
    const added = states.added.map((node) => node.nodeName).join(',');
    const removed = states.removed.map((node) => node.nodeName).join(',');
    const restarted = states.restarted.map((node) => node.nodeName).join(',');
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
