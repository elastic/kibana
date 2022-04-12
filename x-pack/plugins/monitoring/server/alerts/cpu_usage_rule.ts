/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { ElasticsearchClient } from 'kibana/server';
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
import { Alert } from '../../../alerting/server';
import { RULE_CPU_USAGE, RULE_DETAILS } from '../../common/constants';
// @ts-ignore
import { ROUNDED_FLOAT } from '../../common/formatting';
import { fetchCpuUsageNodeStats } from '../lib/alerts/fetch_cpu_usage_node_stats';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { RawAlertInstance, SanitizedRule } from '../../../alerting/common';
import { parseDuration } from '../../../alerting/common/parse_duration';
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
            defaultMessage: 'The node reporting high cpu usage.',
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
    const stats = await fetchCpuUsageNodeStats(
      esClient,
      clusters,
      startMs,
      endMs,
      Globals.app.config.ui.max_bucket_size,
      params.filterQuery
    );
    return stats.map((stat) => {
      if (Globals.app.config.ui.container.elasticsearch.enabled) {
        stat.cpuUsage =
          (stat.containerUsage / (stat.containerPeriods * stat.containerQuota * 1000)) * 100;
      }

      return {
        clusterUuid: stat.clusterUuid,
        shouldFire: stat.cpuUsage > params.threshold!,
        severity: AlertSeverity.Danger,
        meta: stat,
        ccs: stat.ccs,
      };
    });
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
    const stat = item.meta as AlertCpuUsageNodeStats;
    return {
      text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.firingMessage', {
        defaultMessage: `Node #start_link{nodeName}#end_link is reporting cpu usage of {cpuUsage}% at #absolute`,
        values: {
          nodeName: stat.nodeName,
          cpuUsage: numeral(stat.cpuUsage).format(ROUNDED_FLOAT),
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
    const firingNode = alertStates[0] as AlertCpuUsageState;
    if (!firingNode || !firingNode.ui.isFiring) {
      return;
    }
    const shortActionText = i18n.translate('xpack.monitoring.alerts.cpuUsage.shortAction', {
      defaultMessage: 'Verify CPU level of node.',
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
    const internalShortMessage = i18n.translate(
      'xpack.monitoring.alerts.cpuUsage.firing.internalShortMessage',
      {
        defaultMessage: `CPU usage alert is firing for node {nodeName} in cluster: {clusterName}. {shortActionText}`,
        values: {
          clusterName: cluster.clusterName,
          nodeName: firingNode.nodeName,
          shortActionText,
        },
      }
    );
    const internalFullMessage = i18n.translate(
      'xpack.monitoring.alerts.cpuUsage.firing.internalFullMessage',
      {
        defaultMessage: `CPU usage alert is firing for node {nodeName} in cluster: {clusterName}. {action}`,
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
      nodes: `${firingNode.nodeName}:${firingNode.cpuUsage}`,
      count: 1,
      node: `${firingNode.nodeName}:${firingNode.cpuUsage}`,
      clusterName: cluster.clusterName,
      action,
      actionPlain: shortActionText,
    });
  }
}
