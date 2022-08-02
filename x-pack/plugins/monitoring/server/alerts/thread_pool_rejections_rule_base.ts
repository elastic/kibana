/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from '@kbn/core/server';
import { Alert } from '@kbn/alerting-plugin/server';
import { Rule, RawAlertInstance } from '@kbn/alerting-plugin/common';
import { BaseRule } from './base_rule';
import {
  AlertData,
  AlertCluster,
  AlertMessage,
  AlertThreadPoolRejectionsState,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  ThreadPoolRejectionsAlertParams,
  CommonAlertFilter,
  AlertState,
  AlertThreadPoolRejectionsStats,
} from '../../common/types/alerts';
import { fetchThreadPoolRejectionStats } from '../lib/alerts/fetch_thread_pool_rejections_stats';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { AlertingDefaults, createLink } from './alert_helpers';
import { Globals } from '../static_globals';

type ActionVariables = Array<{ name: string; description: string }>;

export class ThreadPoolRejectionsRuleBase extends BaseRule {
  protected static createActionVariables(type: string) {
    return [
      {
        name: 'node',
        description: i18n.translate(
          'xpack.monitoring.alerts.threadPoolRejections.actionVariables.node',
          {
            defaultMessage: 'The node reporting high thread pool {type} rejections.',
            values: { type },
          }
        ),
      },
      ...Object.values(AlertingDefaults.ALERT_TYPE.context),
    ];
  }

  constructor(
    sanitizedRule: Rule | undefined = undefined,
    public readonly id: string,
    public readonly threadPoolType: string,
    public readonly name: string,
    public readonly actionVariables: ActionVariables
  ) {
    super(sanitizedRule, {
      id,
      name,
      defaultParams: {
        threshold: 300,
        duration: '5m',
      },
      actionVariables,
    });
  }

  protected async fetchData(
    params: ThreadPoolRejectionsAlertParams,
    esClient: ElasticsearchClient,
    clusters: AlertCluster[]
  ): Promise<AlertData[]> {
    const { threshold, duration } = params;

    const stats = await fetchThreadPoolRejectionStats(
      esClient,
      clusters,
      Globals.app.config.ui.max_bucket_size,
      this.threadPoolType,
      duration,
      params.filterQuery
    );

    return stats.map((stat) => {
      const { clusterUuid, ccs } = stat;

      return {
        shouldFire: stat.rejectionCount > threshold,
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

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const {
      nodeName,
      nodeId,
      type: threadPoolType,
      rejectionCount,
    } = item.meta as AlertThreadPoolRejectionsStats;
    return {
      text: i18n.translate('xpack.monitoring.alerts.threadPoolRejections.ui.firingMessage', {
        defaultMessage: `Node #start_link{nodeName}#end_link is reporting {rejectionCount} {threadPoolType} rejections at #absolute`,
        values: {
          nodeName,
          threadPoolType,
          rejectionCount,
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.monitorThisNode',
            {
              defaultMessage: `#start_linkMonitor this node#end_link`,
            }
          ),
          `elasticsearch/nodes/${nodeId}/advanced`,
          AlertMessageTokenType.Link
        ),
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.optimizeQueries',
            {
              defaultMessage: '#start_linkOptimize complex queries#end_link',
            }
          ),
          `{elasticWebsiteUrl}blog/advanced-tuning-finding-and-fixing-slow-elasticsearch-queries`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.addMoreNodes', {
            defaultMessage: '#start_linkAdd more nodes#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/add-elasticsearch-nodes.html`
        ),
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.resizeYourDeployment',
            {
              defaultMessage: '#start_linkResize your deployment (ECE)#end_link',
            }
          ),
          `{elasticWebsiteUrl}guide/en/cloud-enterprise/current/ece-resize-deployment.html`
        ),
        createLink(
          i18n.translate(
            'xpack.monitoring.alerts.threadPoolRejections.ui.nextSteps.threadPoolSettings',
            {
              defaultMessage: '#start_linkThread pool settings#end_link',
            }
          ),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/modules-threadpool.html`
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
          url: `elasticsearch/nodes/${nodeId}`,
        } as AlertMessageLinkToken,
      ],
    };
  }
  protected executeActions(
    instance: Alert,
    { alertStates }: { alertStates: AlertState[] },
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    const type = this.threadPoolType;
    const { clusterName: clusterKnownName, clusterUuid } = cluster;
    const clusterName = clusterKnownName || clusterUuid;

    if (alertStates.length === 0) {
      return;
    }
    const firingNode = alertStates[0] as AlertThreadPoolRejectionsState;
    const { nodeName, nodeId } = firingNode;
    if (!firingNode || !firingNode.ui.isFiring) {
      return;
    }
    const shortActionText = i18n.translate(
      'xpack.monitoring.alerts.threadPoolRejections.shortAction',
      {
        defaultMessage: 'Verify thread pool {type} rejections for the affected node.',
        values: {
          type,
        },
      }
    );

    const fullActionText = i18n.translate(
      'xpack.monitoring.alerts.threadPoolRejections.fullAction',
      {
        defaultMessage: 'View node',
      }
    );

    const ccs = alertStates.find((state) => state.ccs)?.ccs;
    const globalStateLink = this.createGlobalStateLink(
      `elasticsearch/nodes/${nodeId}`,
      cluster.clusterUuid,
      ccs
    );

    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.threadPoolRejections.firing.internalShortMessage',
      {
        defaultMessage: `Thread pool {type} rejections alert is firing for node {nodeName} in cluster: {clusterName}. {shortActionText}`,
        values: {
          clusterName,
          nodeName,
          shortActionText,
          type,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.threadPoolRejections.firing.internalFullMessage',
      {
        defaultMessage: `Thread pool {type} rejections alert is firing for node {nodeName} in cluster: {clusterName}. {action}`,
        values: {
          clusterName,
          nodeName,
          action,
          type,
        },
      }
    );

    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage: Globals.app.isCloud ? internalShortMessage : internalFullMessage,
      threadPoolType: type,
      state: AlertingDefaults.ALERT_STATE.firing,
      /* continue to send "count" value for users before https://github.com/elastic/kibana/pull/102544
          see https://github.com/elastic/kibana/issues/100136#issuecomment-865229431
          */
      count: 1,
      node: nodeName,
      clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
