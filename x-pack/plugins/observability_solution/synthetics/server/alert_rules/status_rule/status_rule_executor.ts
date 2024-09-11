/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { queryMonitorStatusForAlert } from './query_monitor_status_alert';
import { SyntheticsServerSetup } from '../../types';
import { SyntheticsEsClient } from '../../lib';
import { SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { StatusRuleParams } from '../../../common/rules/status_rule';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  OverviewStatus,
  OverviewStatusMetaData,
} from '../../../common/runtime_types';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
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
  esClient: SyntheticsEsClient;
  soClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>> = [];

  constructor(
    previousStartedAt: Date | null,
    p: StatusRuleParams,
    soClient: SavedObjectsClientContract,
    scopedClient: ElasticsearchClient,
    server: SyntheticsServerSetup,
    syntheticsMonitorClient: SyntheticsMonitorClient
  ) {
    this.previousStartedAt = previousStartedAt;
    this.params = p;
    this.soClient = soClient;
    this.esClient = new SyntheticsEsClient(this.soClient, scopedClient, {
      heartbeatIndices: SYNTHETICS_INDEX_PATTERN,
    });
    this.server = server;
    this.syntheticsMonitorClient = syntheticsMonitorClient;
  }

  async getMonitors() {
    this.monitors = await getAllMonitors({
      soClient: this.soClient,
      filter: `${monitorAttributes}.${AlertConfigKey.STATUS_ENABLED}: true`,
    });

    const {
      allIds,
      enabledMonitorQueryIds,
      monitorLocationIds,
      monitorLocationMap,
      projectMonitorsCount,
      monitorQueryIdToConfigIdMap,
    } = processMonitors(this.monitors);

    return {
      enabledMonitorQueryIds,
      monitorLocationIds,
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
      monitorLocationIds,
      enabledMonitorQueryIds,
      allIds,
      monitorLocationMap,
      projectMonitorsCount,
      monitorQueryIdToConfigIdMap,
    } = await this.getMonitors();
    const from = this.previousStartedAt
      ? moment(this.previousStartedAt).subtract(1, 'minute').toISOString()
      : 'now-2m';

    if (enabledMonitorQueryIds.length > 0) {
      const currentStatus = await queryMonitorStatusForAlert(
        this.esClient,
        monitorLocationIds,
        {
          to: 'now',
          from,
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
        const isLocationRemoved = !locations.some((l) => l.id === downConfig.locationId);
        if (isLocationRemoved) {
          staleDownConfigs[locPlusId] = { ...downConfig, isLocationRemoved: true };
          delete downConfigs[locPlusId];
        }
      }
    });

    return staleDownConfigs;
  }
}
