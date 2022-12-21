/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getAllMonitors } from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { GetMonitorDownStatusMessageParams } from '../../legacy_uptime/lib/requests/get_monitor_status';
import { queryMonitorStatus } from '../../queries/query_monitor_status';
import { createUptimeESClient, UptimeEsClient } from '../../legacy_uptime/lib/lib';
import { StatusRuleParams } from '../../../common/rules/status_rule';
import { ConfigKey, OverviewStatus } from '../../../common/runtime_types';
import { statusCheckTranslations } from '../../legacy_uptime/lib/alerts/translations';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';

export class StatusRuleExecutor {
  previousStartedAt: Date | null;
  params: StatusRuleParams;
  esClient: UptimeEsClient;
  soClient: SavedObjectsClientContract;
  syntheticsMonitorClient: SyntheticsMonitorClient;

  constructor(
    previousStartedAt: Date | null,
    p: StatusRuleParams,
    soClient: SavedObjectsClientContract,
    scopedClient: ElasticsearchClient,
    syntheticsMonitorClient: SyntheticsMonitorClient
  ) {
    this.previousStartedAt = previousStartedAt;
    this.params = p;
    this.soClient = soClient;
    this.esClient = createUptimeESClient({
      esClient: scopedClient,
      savedObjectsClient: this.soClient,
    });
    this.syntheticsMonitorClient = syntheticsMonitorClient;
  }

  async getMonitors() {
    const monitors = await getAllMonitors(
      this.soClient,
      'attributes.status_alert_enabled: true and attributes.enabled: true'
    );
    const enabledIds: string[] = [];
    let maxLocations = 1;

    monitors.forEach((monitor) => {
      const attrs = monitor.attributes;
      enabledIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);
      maxLocations = Math.max(maxLocations, attrs[ConfigKey.LOCATIONS].length);
    });

    return { enabledIds, maxLocations };
  }

  async getDownChecks(prevDownConfigs: OverviewStatus['downConfigs'] = {}) {
    const { maxLocations, enabledIds } = await this.getMonitors();
    if (enabledIds.length > 0) {
      const currentStatus = await queryMonitorStatus(
        this.esClient,
        maxLocations,
        { to: 'now', from: this.previousStartedAt?.toISOString() ?? 'now-1m' },
        enabledIds
      );

      const downConfigs = currentStatus.downConfigs;
      const upConfigs = currentStatus.upConfigs;

      Object.keys(prevDownConfigs).forEach((locId) => {
        if (!downConfigs[locId] && !upConfigs[locId]) {
          downConfigs[locId] = prevDownConfigs[locId];
        }
      });

      return currentStatus;
    }
    return { downConfigs: { ...prevDownConfigs }, upConfigs: {} };
  }

  async getStatusMessage(downMonParams?: GetMonitorDownStatusMessageParams) {
    let statusMessage = '';
    if (downMonParams?.info) {
      statusMessage = statusCheckTranslations.downMonitorsLabel(
        downMonParams.count!,
        downMonParams.interval!,
        downMonParams.numTimes
      );
    }
    return statusMessage;
  }
}
