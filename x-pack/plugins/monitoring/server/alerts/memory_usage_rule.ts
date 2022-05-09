/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { ElasticsearchClient } from '@kbn/core/server';
import { Alert } from '@kbn/alerting-plugin/server';
import { RawAlertInstance, SanitizedRule } from '@kbn/alerting-plugin/common';
import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';
import { BaseRule } from './base_rule';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertMemoryUsageState,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertParams,
  AlertMemoryUsageNodeStats,
  CommonAlertFilter,
} from '../../common/types/alerts';
import { RULE_MEMORY_USAGE, RULE_DETAILS } from '../../common/constants';
// @ts-ignore
import { ROUNDED_FLOAT } from '../../common/formatting';
import { fetchMemoryUsageNodeStats } from '../lib/alerts/fetch_memory_usage_node_stats';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { AlertingDefaults, createLink } from './alert_helpers';
import { Globals } from '../static_globals';

export class MemoryUsageRule extends BaseRule {
  constructor(public sanitizedRule?: SanitizedRule) {
    super(sanitizedRule, {
      id: RULE_MEMORY_USAGE,
      name: RULE_DETAILS[RULE_MEMORY_USAGE].label,
      accessorKey: 'memoryUsage',
      defaultParams: {
        threshold: 85,
        duration: '5m',
      },
      actionVariables: [
        {
          name: 'node',
          description: i18n.translate('xpack.monitoring.alerts.memoryUsage.actionVariables.node', {
            defaultMessage: 'The node reporting high memory usage.',
          }),
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
    const { duration, threshold } = params;
    const parsedDuration = parseDuration(duration as string);
    const endMs = +new Date();
    const startMs = endMs - parsedDuration;

    const stats = await fetchMemoryUsageNodeStats(
      esClient,
      clusters,
      startMs,
      endMs,
      Globals.app.config.ui.max_bucket_size,
      params.filterQuery
    );

    return stats.map((stat) => {
      const { clusterUuid, memoryUsage, ccs } = stat;
      return {
        shouldFire: memoryUsage > threshold!,
        severity: AlertSeverity.Danger,
        meta: stat,
        clusterUuid,
        ccs,
      };
    });
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    return super.filterAlertInstance(alertInstance, filters, true);
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    const currentState = super.getDefaultAlertState(cluster, item);
    currentState.ui.severity = AlertSeverity.Warning;
    return currentState;
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const stat = item.meta as AlertMemoryUsageNodeStats;
    return {
      text: i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.firingMessage', {
        defaultMessage: `Node #start_link{nodeName}#end_link is reporting JVM memory usage of {memoryUsage}% at #absolute`,
        values: {
          nodeName: stat.nodeName,
          memoryUsage: numeral(stat.memoryUsage).format(ROUNDED_FLOAT),
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.nextSteps.tuneThreadPools', {
            defaultMessage: '#start_linkTune thread pools#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/modules-threadpool.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.nextSteps.managingHeap', {
            defaultMessage: '#start_linkManaging ES Heap#end_link',
          }),
          `{elasticWebsiteUrl}blog/a-heap-of-trouble`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.nextSteps.identifyIndicesShards', {
            defaultMessage: '#start_linkIdentify large indices/shards#end_link',
          }),
          'elasticsearch/indices',
          AlertMessageTokenType.Link
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.nextSteps.addMoreNodes', {
            defaultMessage: '#start_linkAdd more data nodes#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/add-elasticsearch-nodes.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.memoryUsage.ui.nextSteps.resizeYourDeployment', {
            defaultMessage: '#start_linkResize your deployment (ECE)#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/cloud-enterprise/current/ece-resize-deployment.html`
        ),
      ],
      tokens: [
        {
          startToken: '#absolute',
          type: AlertMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp: alertState.ui.triggeredMS,
        } as AlertMessageTimeToken,
        {
          startToken: '#start_link',
          endToken: '#end_link',
          type: AlertMessageTokenType.Link,
          url: `elasticsearch/nodes/${stat.nodeId}`,
        } as AlertMessageLinkToken,
      ],
    };
  }

  protected executeActions(
    instance: Alert,
    { alertStates }: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    if (alertStates.length === 0) {
      return;
    }
    const firingNode = alertStates[0] as AlertMemoryUsageState;
    if (!firingNode || !firingNode.ui.isFiring) {
      return;
    }

    const shortActionText = i18n.translate('xpack.monitoring.alerts.memoryUsage.shortAction', {
      defaultMessage: 'Verify memory usage level of node.',
    });
    const fullActionText = i18n.translate('xpack.monitoring.alerts.memoryUsage.fullAction', {
      defaultMessage: 'View node',
    });

    const ccs = alertStates.find((state) => state.ccs)?.ccs;
    const globalStateLink = this.createGlobalStateLink(
      `elasticsearch/nodes/${firingNode.nodeId}`,
      cluster.clusterUuid,
      ccs
    );
    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.memoryUsage.firing.internalShortMessage',
      {
        defaultMessage: `Memory usage alert is firing for node {nodeName} in cluster: {clusterName}. {shortActionText}`,
        values: {
          clusterName: cluster.clusterName,
          nodeName: firingNode.nodeName,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.memoryUsage.firing.internalFullMessage',
      {
        defaultMessage: `Memory usage alert is firing for node {nodeName} in cluster: {clusterName}. {action}`,
        values: {
          clusterName: cluster.clusterName,
          nodeName: firingNode.nodeName,
          action,
        },
      }
    );

    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage: Globals.app.isCloud ? internalShortMessage : internalFullMessage,
      state: AlertingDefaults.ALERT_STATE.firing,
      /* continue to send "nodes" and "count" values for users before https://github.com/elastic/kibana/pull/102544
        see https://github.com/elastic/kibana/issues/100136#issuecomment-865229431
        */
      nodes: `${firingNode.nodeName}:${firingNode.memoryUsage.toFixed(2)}`,
      count: 1,
      node: `${firingNode.nodeName}:${firingNode.memoryUsage.toFixed(2)}`,
      clusterName: cluster.clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
