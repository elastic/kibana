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
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { BaseRule } from './base_rule';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertCpuUsageState,
  AlertCpuUsageNodeStats,
  AlertMessageTimeToken,
  AlertMessageLinkToken,
  AlertInstanceState,
  CommonAlertParams,
  CommonAlertFilter,
} from '../../common/types/alerts';
import { RULE_CPU_USAGE, RULE_DETAILS } from '../../common/constants';
import { ROUNDED_FLOAT } from '../../common/formatting';
import { fetchCpuUsageNodeStats } from '../lib/alerts/fetch_cpu_usage_node_stats';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { AlertingDefaults, createLink } from './alert_helpers';
import { Globals } from '../static_globals';

export class CpuUsageRule extends BaseRule {
  constructor(public sanitizedRule?: SanitizedRule) {
    super(sanitizedRule, {
      id: RULE_CPU_USAGE,
      name: RULE_DETAILS[RULE_CPU_USAGE].label,
      accessorKey: 'cpuUsage',
      defaultParams: {
        threshold: 85,
        duration: '5m',
      },
      actionVariables: [
        {
          name: 'node',
          description: i18n.translate('xpack.monitoring.alerts.cpuUsage.actionVariables.node', {
            defaultMessage: 'The node reporting high CPU usage.',
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
    const duration = parseDuration(params.duration);
    const endMs = +new Date();
    const startMs = endMs - duration;

    let filterQuery;
    if (params.filterQuery) {
      try {
        filterQuery = JSON.parse(params.filterQuery) as QueryDslQueryContainer;
      } catch (error) {
        throw new Error(`Failed to parse filter query in CPU usage rule ${error}`);
      }
    }

    const stats = await fetchCpuUsageNodeStats(
      {
        esClient,
        clusterUuids: clusters.map((cluster) => cluster.clusterUuid),
        startMs,
        endMs,
        filterQuery,
        logger: this.scopedLogger,
      },
      Globals.app.config
    );

    return stats.map((stat) => ({
      clusterUuid: stat.clusterUuid,
      ...this.outcomeAndSeverity(stat, params.threshold!),
      meta: {
        ...stat,
        threshold: params.threshold!,
      },
      ccs: stat.ccs,
    }));
  }

  private outcomeAndSeverity(
    stat: AlertCpuUsageNodeStats,
    threshold: number
  ): { shouldFire: boolean; severity: AlertSeverity } {
    if (
      stat.missingLimits ||
      stat.limitsChanged ||
      stat.unexpectedLimits ||
      stat.cpuUsage === undefined
    ) {
      let severity = AlertSeverity.Warning;
      if (stat.cpuUsage && stat.cpuUsage > threshold) {
        severity = AlertSeverity.Danger;
      }
      return { shouldFire: true, severity };
    }

    return { shouldFire: stat.cpuUsage > threshold, severity: AlertSeverity.Danger };
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    return super.filterAlertInstance(alertInstance, filters, true);
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    const base = super.getDefaultAlertState(cluster, item);
    return {
      ...base,
      ui: {
        ...base.ui,
        severity: AlertSeverity.Danger,
      },
    };
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const stat = item.meta as AlertCpuUsageNodeStats & Pick<CommonAlertParams, 'threshold'>;
    const tokens = [
      {
        startToken: '#start_link',
        endToken: '#end_link',
        type: AlertMessageTokenType.Link,
        url: `elasticsearch/nodes/${stat.nodeId}`,
      } as AlertMessageLinkToken,
      {
        startToken: '#absolute',
        type: AlertMessageTokenType.Time,
        isAbsolute: true,
        isRelative: false,
        timestamp: alertState.ui.triggeredMS,
      } as AlertMessageTimeToken,
    ];

    if (stat.missingLimits) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.missingLimits', {
          defaultMessage: `Kibana is configured for containerized workloads but node #start_link{nodeName}#end_link does not have resource limits configured. Fallback metric reports usage of {cpuUsage}%. Last checked at #absolute`,
          values: {
            nodeName: stat.nodeName,
            cpuUsage: numeral(stat.cpuUsage).format(ROUNDED_FLOAT),
          },
        }),
        tokens,
      };
    }

    if (stat.unexpectedLimits) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.unexpectedLimits', {
          defaultMessage: `Kibana is configured for non-containerized workloads but node #start_link{nodeName}#end_link has resource limits configured. Node reports usage of {cpuUsage}%. Last checked at #absolute`,
          values: {
            nodeName: stat.nodeName,
            cpuUsage: numeral(stat.cpuUsage).format(ROUNDED_FLOAT),
          },
        }),
        tokens,
      };
    }

    if (stat.limitsChanged) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.limitsChanged', {
          defaultMessage: `Resource limits for node #start_link{nodeName}#end_link has changed within the look back window, unable to confidently calculate CPU usage for alerting. Please monitor the usage until the window has moved. Last checked at #absolute`,
          values: {
            nodeName: stat.nodeName,
          },
        }),
        tokens,
      };
    }

    if (stat.cpuUsage === undefined) {
      return {
        text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.failedToComputeUsage', {
          defaultMessage: `Failed to compute CPU usage for node #start_link{nodeName}#end_link. Please check the Kibana logs for more details. Last checked at #absolute`,
          values: {
            nodeName: stat.nodeName,
          },
        }),
        tokens,
      };
    }

    return {
      text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.firingMessage', {
        defaultMessage: `Node #start_link{nodeName}#end_link is reporting CPU usage of {cpuUsage}% which is above the configured threshold of {threshold}%. Last checked at #absolute`,
        values: {
          nodeName: stat.nodeName,
          cpuUsage: numeral(stat.cpuUsage).format(ROUNDED_FLOAT),
          threshold: stat.threshold,
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.nextSteps.hotThreads', {
            defaultMessage: '#start_linkCheck hot threads#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/cluster-nodes-hot-threads.html`
        ),
        createLink(
          i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.nextSteps.runningTasks', {
            defaultMessage: '#start_linkCheck long running tasks#end_link',
          }),
          `{elasticWebsiteUrl}guide/en/elasticsearch/reference/{docLinkVersion}/tasks.html`
        ),
      ],
      tokens,
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
    const firingNode = alertStates[0] as AlertCpuUsageState;
    if (!firingNode || !firingNode.ui.isFiring) {
      return;
    }
    const shortActionText = i18n.translate('xpack.monitoring.alerts.cpuUsage.shortAction', {
      defaultMessage: 'Verify CPU usage of node.',
    });
    const fullActionText = i18n.translate('xpack.monitoring.alerts.cpuUsage.fullAction', {
      defaultMessage: 'View node',
    });
    const ccs = firingNode.ccs;
    const globalStateLink = this.createGlobalStateLink(
      `elasticsearch/nodes/${firingNode.nodeId}`,
      cluster.clusterUuid,
      ccs
    );
    const action = `[${fullActionText}](${globalStateLink})`;
    const internalShortMessage = this.getMessage(firingNode, cluster.clusterName, shortActionText);
    const internalFullMessage = this.getMessage(firingNode, cluster.clusterName, action);
    instance.scheduleActions('default', {
      internalShortMessage,
      internalFullMessage: Globals.app.isCloud ? internalShortMessage : internalFullMessage,
      state: AlertingDefaults.ALERT_STATE.firing,
      /* continue to send "nodes" and "count" values for users before https://github.com/elastic/kibana/pull/102544
        see https://github.com/elastic/kibana/issues/100136#issuecomment-865229431
        */
      nodes: `${firingNode.nodeName}:${firingNode.cpuUsage}`,
      count: 1,
      node: `${firingNode.nodeName}:${firingNode.cpuUsage}`,
      clusterName: cluster.clusterName,
      action,
      actionPlain: shortActionText,
    });
  }

  private getMessage(state: AlertCpuUsageState, clusterName: string, action: string) {
    const stat = state.meta as AlertCpuUsageNodeStats;

    if (
      stat.missingLimits ||
      stat.limitsChanged ||
      stat.unexpectedLimits ||
      stat.cpuUsage === undefined
    ) {
      return i18n.translate('xpack.monitoring.alerts.cpuUsage.firing.internalMessageForFailure', {
        defaultMessage: `CPU usage alert for node {nodeName} in cluster {clusterName} faced issues while evaluating the usage. {action}`,
        values: {
          clusterName,
          nodeName: state.nodeName,
          action,
        },
      });
    }

    return i18n.translate('xpack.monitoring.alerts.cpuUsage.firing.internalMessage', {
      defaultMessage: `CPU usage alert is firing for node {nodeName} in cluster {clusterName}. {action}`,
      values: {
        clusterName,
        nodeName: state.nodeName,
        action,
      },
    });
  }
}
