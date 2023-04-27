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
import { getAllLocations } from '../../synthetics_service/get_all_locations';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { queryMonitorStatus } from '../../queries/query_monitor_status';
import { UptimeEsClient } from '../../legacy_uptime/lib/lib';
import { StatusRuleParams } from '../../../common/rules/status_rule';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  OverviewStatus,
  OverviewStatusMetaData,
} from '../../../common/runtime_types';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { AlertConfigKey } from '../../../common/constants/monitor_management';

export interface StaleDownConfig extends OverviewStatusMetaData {
  isDeleted?: boolean;
  isLocationRemoved?: boolean;
}

export interface AlertOverviewStatus
  extends Omit<OverviewStatus, 'disabledCount' | 'disabledMonitorQueryIds'> {
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
    const { publicLocations, privateLocations } = await getAllLocations({
      server: this.server,
      syntheticsMonitorClient: this.syntheticsMonitorClient,
      savedObjectsClient: this.soClient,
    });

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
      filter: `${monitorAttributes}.${AlertConfigKey.STATUS_ENABLED}: true`,
    });

    const {
      allIds,
      enabledMonitorQueryIds,
      listOfLocations,
      monitorLocationMap,
      projectMonitorsCount,
      monitorQueryIdToConfigIdMap,
    } = await processMonitors(
      this.monitors,
      this.server,
      this.soClient,
      this.syntheticsMonitorClient
    );

    return {
      enabledMonitorQueryIds,
      listOfLocations,
      allIds,
      monitorLocationMap,
      projectMonitorsCount,
      monitorQueryIdToConfigIdMap,
    };
  }

  async getDownChecks(
    prevDownConfigs: OverviewStatus['downConfigs'] = {}
  ): Promise<AlertOverviewStatus> {
    const {
      listOfLocations,
      enabledMonitorQueryIds,
      allIds,
      monitorLocationMap,
      projectMonitorsCount,
      monitorQueryIdToConfigIdMap,
    } = await this.getMonitors();

    if (enabledMonitorQueryIds.length > 0) {
      const currentStatus = await queryMonitorStatus(
        this.esClient,
        listOfLocations,
        {
          to: 'now',
          from: this.previousStartedAt?.toISOString() ?? 'now-1m',
        },
        enabledMonitorQueryIds,
        monitorLocationMap,
        monitorQueryIdToConfigIdMap
      );

      const downConfigs = currentStatus.downConfigs;
      const upConfigs = currentStatus.upConfigs;

      Object.keys(prevDownConfigs).forEach((locId) => {
        if (!downConfigs[locId] && !upConfigs[locId]) {
          downConfigs[locId] = prevDownConfigs[locId];
        }
      });

      const staleDownConfigs = this.markDeletedConfigs(downConfigs);

      return {
        ...currentStatus,
        staleDownConfigs,
        projectMonitorsCount,
        allMonitorsCount: allIds.length,
        disabledMonitorsCount: allIds.length - enabledMonitorQueryIds.length,
        allIds,
      };
    }
    const staleDownConfigs = this.markDeletedConfigs(prevDownConfigs);
    return {
      downConfigs: { ...prevDownConfigs },
      upConfigs: {},
      pendingConfigs: {},
      staleDownConfigs,
      down: 0,
      up: 0,
      pending: 0,
      enabledMonitorQueryIds,
      allMonitorsCount: allIds.length,
      disabledMonitorsCount: allIds.length,
      projectMonitorsCount,
      allIds,
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
}
