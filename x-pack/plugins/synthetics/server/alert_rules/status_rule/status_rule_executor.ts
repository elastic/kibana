/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { resolveMissingLabels } from '../../routes/status/current_status';
import { AlertConfigKey } from '../../../common/constants/monitor_management';
import { getAllLocations } from '../../synthetics_service/get_all_locations';
import { getAllMonitors } from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { GetMonitorDownStatusMessageParams } from '../../legacy_uptime/lib/requests/get_monitor_status';
import { queryMonitorStatus } from '../../queries/query_monitor_status';
import { UptimeEsClient } from '../../legacy_uptime/lib/lib';
import { StatusRuleParams } from '../../../common/rules/status_rule';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  OverviewStatus,
  OverviewStatusMetaData,
} from '../../../common/runtime_types';
import { statusCheckTranslations } from '../../legacy_uptime/lib/alerts/translations';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';

export interface StaleDownConfig extends OverviewStatusMetaData {
  isDeleted?: boolean;
  isLocationRemoved?: boolean;
}

export interface AlertOverviewStatus extends Omit<OverviewStatus, 'disabledCount'> {
  staleDownConfigs: Record<string, StaleDownConfig>;
}

export class StatusRuleExecutor {
  previousStartedAt: Date | null;
  params: StatusRuleParams;
  esClient: UptimeEsClient;
  soClient: SavedObjectsClientContract;
  server: UptimeServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>> = [];

  public locationIdNameMap: Record<string, string> = {};

  constructor(
    previousStartedAt: Date | null,
    p: StatusRuleParams,
    soClient: SavedObjectsClientContract,
    scopedClient: ElasticsearchClient,
    server: UptimeServerSetup,
    syntheticsMonitorClient: SyntheticsMonitorClient
  ) {
    this.previousStartedAt = previousStartedAt;
    this.params = p;
    this.soClient = soClient;
    this.esClient = new UptimeEsClient(this.soClient, scopedClient);
    this.server = server;
    this.syntheticsMonitorClient = syntheticsMonitorClient;
  }

  async getAllLocationNames() {
    const { publicLocations, privateLocations } = await getAllLocations(
      this.server,
      this.syntheticsMonitorClient,
      this.soClient
    );

    publicLocations.forEach((loc) => {
      this.locationIdNameMap[loc.label] = loc.id;
    });

    privateLocations.forEach((loc) => {
      this.locationIdNameMap[loc.label] = loc.id;
    });
  }

  getLocationId(name: string) {
    return this.locationIdNameMap[name];
  }

  async getMonitors() {
    await this.getAllLocationNames();
    this.monitors = await getAllMonitors({
      soClient: this.soClient,
      search: `attributes.${AlertConfigKey.STATUS_ENABLED}: true`,
    });
    const allIds: string[] = [];
    const enabledIds: string[] = [];
    let listOfLocationsSet = new Set<string>();
    const missingLabelLocations = new Set<string>();

    this.monitors.forEach((monitor) => {
      const attrs = monitor.attributes;
      allIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);
      if (attrs[ConfigKey.ENABLED] === true) {
        enabledIds.push(attrs[ConfigKey.MONITOR_QUERY_ID]);
      }

      listOfLocationsSet = new Set([
        ...listOfLocationsSet,
        ...(attrs[ConfigKey.LOCATIONS]
          .filter((loc) => {
            if (!loc.label) {
              missingLabelLocations.add(loc.id);
            }
            return loc.label;
          })
          .map((location) => location.label) as string[]),
      ]);
    });

    const { listOfLocations } = await resolveMissingLabels(
      this.server,
      this.soClient,
      this.syntheticsMonitorClient,
      listOfLocationsSet,
      missingLabelLocations
    );

    return { enabledIds, listOfLocations, allIds };
  }

  async getDownChecks(
    prevDownConfigs: OverviewStatus['downConfigs'] = {}
  ): Promise<AlertOverviewStatus> {
    const { listOfLocations, enabledIds } = await this.getMonitors();

    if (enabledIds.length > 0) {
      const currentStatus = await queryMonitorStatus(
        this.esClient,
        [...listOfLocations],
        {
          to: 'now',
          from: this.previousStartedAt?.toISOString() ?? 'now-1m',
        },
        enabledIds
      );

      const downConfigs = currentStatus.downConfigs;
      const upConfigs = currentStatus.upConfigs;

      Object.keys(prevDownConfigs).forEach((locId) => {
        if (!downConfigs[locId] && !upConfigs[locId]) {
          downConfigs[locId] = prevDownConfigs[locId];
        }
      });

      const staleDownConfigs = this.markDeletedConfigs(downConfigs);

      return { ...currentStatus, staleDownConfigs };
    }
    const staleDownConfigs = this.markDeletedConfigs(prevDownConfigs);
    return {
      downConfigs: { ...prevDownConfigs },
      upConfigs: {},
      staleDownConfigs,
      down: 0,
      up: 0,
      enabledIds,
    };
  }

  markDeletedConfigs(downConfigs: OverviewStatus['downConfigs']) {
    const monitors = this.monitors;
    const staleDownConfigs: AlertOverviewStatus['staleDownConfigs'] = {};
    Object.keys(downConfigs).forEach((locPlusId) => {
      const downConfig = downConfigs[locPlusId];
      const monitor = monitors.find((m) => {
        return (
          m.id === downConfig.configId ||
          m.attributes[ConfigKey.MONITOR_QUERY_ID] === downConfig.monitorQueryId
        );
      });
      if (!monitor) {
        staleDownConfigs[locPlusId] = { ...downConfig, isDeleted: true };
        delete downConfigs[locPlusId];
      } else {
        const { locations } = monitor.attributes;
        if (!locations.some((l) => l.label === downConfig.location)) {
          staleDownConfigs[locPlusId] = { ...downConfig, isLocationRemoved: true };
          delete downConfigs[locPlusId];
        }
      }
    });

    return staleDownConfigs;
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
