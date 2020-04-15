/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IUiSettingsClient } from 'kibana/server';
import { pick, get } from 'lodash';
import { Logger } from '../../../../../../src/core/server';
import { AlertsClient } from '../../../../alerting/server';
import {
  getThreshold as getGuardRailCpuUsageThreshold,
  getThrottle as getGuardRailCpuUsageThrottle,
} from './guard_rail_cpu_usage.lib';
import { ALERT_GUARD_RAIL_TYPE_CPU_USAGE } from '../../../common/constants';
// @ts-ignore
import { getLogs } from '../logs/get_logs';
// @ts-ignore
import { getMetrics } from '../details/get_metrics';
import { AlertCpuUsageState } from '../../alerts/types';

export async function fetchAlert(
  alertsClient: AlertsClient,
  uiSettings: IUiSettingsClient,
  type: string,
  log: Logger,
  legacyConfig: any,
  legacyRequest: any,
  filebeatIndexPattern: string,
  elasticsearchIndexPattern: string,
  start: number,
  end: number
): Promise<any> {
  // We need to get the id from the alertTypeId
  const alerts = await alertsClient.find({
    options: {
      filter: `alert.attributes.alertTypeId:${type}`,
    },
  });
  if (alerts.total === 0) {
    return null;
  }
  if (alerts.total !== 1) {
    log.warn(`Found more than one alert for type ${type} which is unexpected.`);
  }

  const alert = alerts.data[0];
  const id = alert.id;
  const instances = [];

  // Now that we have the id, we can get the state
  const states = await alertsClient.getAlertState({ id });
  if (!states || !states.alertInstances) {
    log.warn(`No alert states found for type ${type} which is unexpected.`);
    return null;
  }

  const mutedInstanceIds = alert.mutedInstanceIds || [];
  for (const instanceId in states.alertInstances) {
    if (states.alertInstances.hasOwnProperty(instanceId)) {
      const instance = states.alertInstances[instanceId];
      const state: AlertCpuUsageState = (instance.state as unknown) as AlertCpuUsageState;
      let logs = { enabled: false };
      let metrics = null;
      if (state) {
        logs = await getLogs(legacyConfig, legacyRequest, filebeatIndexPattern, {
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
        metrics = metricData[metric][0].data;
      }

      instances.push({
        ...instance,
        instanceId,
        muted: mutedInstanceIds.includes(instanceId),
        logs,
        metrics,
      });
    }
  }

  const result = {
    id,
    // Copied from the `bodySchema` in alerting/server/routes/update.ts
    raw: pick(alert, ['name', 'tags', 'schedule', 'throttle', 'params', 'actions']),
    type,
    instances,
    throttle: '',
    threshold: 0,
  };

  switch (type) {
    case ALERT_GUARD_RAIL_TYPE_CPU_USAGE:
      result.throttle = await getGuardRailCpuUsageThrottle(uiSettings);
      result.threshold = await getGuardRailCpuUsageThreshold(uiSettings);
      break;
  }

  return result;
}
