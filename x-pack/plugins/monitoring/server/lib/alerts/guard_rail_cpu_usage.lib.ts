/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from 'kibana/server';
import { AlertInstance } from '../../../../alerting/server';
import {
  AlertMessageLinkToken,
  AlertMessageTimeToken,
  AlertMessage,
  AlertCpuUsageState,
  AlertCpuUsageNodeStats,
  AlertCluster,
} from '../../alerts/types';
import {
  ALERT_GUARD_RAIL_TYPE_CPU_USAGE,
  MONITORING_CONFIG_ALERT_GUARD_RAIL_CPU_USAGE_THRESHOLD,
  INDEX_PATTERN_ELASTICSEARCH,
} from '../../../common/constants';
import { AlertMessageTokenType } from '../../alerts/enums';
import { MonitoringConfig } from '../../config';
// @ts-ignore
import { getLogs } from '../logs/get_logs';
// @ts-ignore
import { getMetrics } from '../details/get_metrics';
// @ts-ignore
import { prefixIndexPattern } from '../ccs_utils';

const RESOLVED_SUBJECT_TEXT = i18n.translate('xpack.monitoring.alerts.cpuUsage.subject.resolved', {
  defaultMessage: 'RESOLVED',
});

const NEW_SUBJECT_TEXT = i18n.translate('xpack.monitoring.alerts.cpuUsage.subject.new', {
  defaultMessage: 'NEW',
});

const SUBJECT = i18n.translate('xpack.monitoring.alerts.cpuUsage.subject', {
  defaultMessage: 'X-Pack Monitoring: CPU Usage exceeded threshold',
});

const RESOLVED_MESSAGE_TEXT = i18n.translate('xpack.monitoring.alerts.cpuUsage.message.resolved', {
  defaultMessage: 'This cluster alert has been resolved: ',
});

function tokenize(
  message: string,
  config: MonitoringConfig,
  defaults: Record<string, any> | null = null
) {
  let tokenized = message;
  const tokens: Record<string, any> = {
    ...config.alerts.cpu_usage.email.tokens,
    ...(defaults || {}),
  };
  for (const name in tokens) {
    if (tokens.hasOwnProperty(name)) {
      tokenized = tokenized.replace(`{${name}}`, tokens[name]);
    }
  }
  return tokenized;
}

export function executeActions(
  instance: AlertInstance,
  alertState: AlertCpuUsageState,
  stat: AlertCpuUsageNodeStats,
  cluster: AlertCluster,
  kibanaUrl: string,
  config: MonitoringConfig,
  emailAddress: string
) {
  const subject = tokenize(
    `${!alertState.ui.isFiring ? RESOLVED_SUBJECT_TEXT : NEW_SUBJECT_TEXT} ${config.alerts.cpu_usage
      .email.subject || SUBJECT}`,
    config
  );
  const url = `${kibanaUrl}/app/monitoring#/alert/${ALERT_GUARD_RAIL_TYPE_CPU_USAGE}`;
  const defaults: Record<string, any> = {
    clusterName: cluster.clusterName,
    cpuUsage: alertState.cpuUsage,
    nodeName: stat.nodeName,
    url,
  };
  const message = tokenize(
    `${alertState.ui.isFiring ? '' : RESOLVED_MESSAGE_TEXT} ${config.alerts.cpu_usage.email
      .message ||
      i18n.translate('xpack.monitoring.alerts.cpuUsage.message', {
        defaultMessage: `We detected that **{nodeName}** in **{clusterName}** is reporting cpu usage of **{cpuUsage}%**. [Click to view more]({url})`,
        values: defaults,
      })}`,
    config,
    defaults
  );

  instance.scheduleActions('default', {
    subject,
    message,
    to: emailAddress,
  });
}

export function getUiMessage(
  alertState: AlertCpuUsageState,
  stat: AlertCpuUsageNodeStats
): AlertMessage {
  if (!alertState.ui.isFiring) {
    return {
      text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.resolvedMessage', {
        defaultMessage: `The cpu usage on node {nodeName} is now under the threshold, currently reporting at {cpuUsage}% as of #resolved`,
        values: {
          nodeName: stat.nodeName,
          cpuUsage: alertState.cpuUsage,
        },
      }),
      tokens: [
        {
          startToken: '#resolved',
          type: AlertMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp: alertState.ui.resolvedMS,
        } as AlertMessageTimeToken,
      ],
    };
  }
  return {
    text: i18n.translate('xpack.monitoring.alerts.cpuUsage.ui.firingMessage', {
      defaultMessage: `Node {nodeName} is reporting cpu usage of {cpuUsage}% at #absolute. #start_linkPlease investigate.#end_link`,
      values: {
        nodeName: stat.nodeName,
        cpuUsage: alertState.cpuUsage,
      },
    }),
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
        url: `/elasticsearch/nodes/${stat.nodeId}`,
      } as AlertMessageLinkToken,
    ],
  };
}

export async function getThreshold(uiSettings: IUiSettingsClient) {
  const raw = await uiSettings.get<string>(MONITORING_CONFIG_ALERT_GUARD_RAIL_CPU_USAGE_THRESHOLD);
  return parseInt(raw, 10);
}

export async function enhanceAlertState(
  legacyConfig: any,
  legacyRequest: any,
  start: number,
  end: number,
  state: AlertCpuUsageState
) {
  const ccs = '*';
  const filebeatIndexPattern = prefixIndexPattern(
    legacyConfig,
    legacyConfig.get('monitoring.ui.logs.index'),
    ccs
  );
  const elasticsearchIndexPattern = prefixIndexPattern(
    legacyConfig,
    INDEX_PATTERN_ELASTICSEARCH,
    ccs
  );

  const logs = await getLogs(legacyConfig, legacyRequest, filebeatIndexPattern, {
    clusterUuid: state.cluster.clusterUuid,
    nodeUuid: state.nodeId,
    start,
    end,
  });

  const showCgroupMetricsElasticsearch = legacyConfig.get(
    'monitoring.ui.container.elasticsearch.enabled'
  );
  const metric = showCgroupMetricsElasticsearch
    ? 'node_cgroup_quota_as_cpu_utilization'
    : 'node_cpu_utilization';
  const metricData = await getMetrics(
    legacyRequest,
    elasticsearchIndexPattern,
    [metric],
    [{ term: { 'source_node.uuid': state.nodeId } }]
  );
  const metrics = metricData[metric][0].data;

  return { logs, metrics };
}
