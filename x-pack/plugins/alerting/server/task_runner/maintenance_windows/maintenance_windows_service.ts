/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { MaintenanceWindow } from '../../application/maintenance_window/types';
import { filterMaintenanceWindowsIds } from './get_maintenance_windows';
import { MaintenanceWindowClientApi } from '../../types';
import { AlertingEventLogger } from '../../lib/alerting_event_logger/alerting_event_logger';
import { withAlertingSpan } from '../lib';

export const DEFAULT_CACHE_INTERVAL_MS = 60000; // 1 minute cache

interface MaintenanceWindowServiceOpts {
  cacheInterval?: number;
  getMaintenanceWindowClientWithRequest(request: KibanaRequest): MaintenanceWindowClientApi;
  logger: Logger;
}

interface MaintenanceWindowData {
  maintenanceWindows: MaintenanceWindow[];
  maintenanceWindowsWithoutScopedQueryIds: string[];
}

interface GetMaintenanceWindowsOpts {
  request: KibanaRequest;
  spaceId: string;
}

type LoadMaintenanceWindowsOpts = GetMaintenanceWindowsOpts & {
  eventLogger: AlertingEventLogger;
  ruleTypeCategory: string;
};

interface LastUpdatedWindows {
  lastUpdated: number;
  activeMaintenanceWindows: MaintenanceWindow[];
}

export class MaintenanceWindowsService {
  private cacheIntervalMs = DEFAULT_CACHE_INTERVAL_MS;

  private windows: Map<string, LastUpdatedWindows> = new Map();

  constructor(private readonly options: MaintenanceWindowServiceOpts) {
    if (options.cacheInterval) {
      this.cacheIntervalMs = options.cacheInterval;
    }
  }

  public async getMaintenanceWindows(
    opts: GetMaintenanceWindowsOpts
  ): Promise<MaintenanceWindow[]> {
    const now = Date.now();
    if (this.windows.has(opts.spaceId)) {
      const windowsFromLastUpdate = this.windows.get(opts.spaceId)!;
      const lastUpdated = new Date(windowsFromLastUpdate.lastUpdated).getTime();

      if (now - lastUpdated >= this.cacheIntervalMs) {
        // cache expired, refetch settings
        try {
          return await this.fetchMaintenanceWindows(opts.request, opts.spaceId, now);
        } catch (err) {
          // return cached settings on error
          this.options.logger.debug(
            `Failed to fetch maintenance windows after cache expiration, using cached windows: ${err.message}`
          );
          return windowsFromLastUpdate.activeMaintenanceWindows;
        }
      } else {
        return windowsFromLastUpdate.activeMaintenanceWindows;
      }
    } else {
      // nothing in cache, fetch settings
      try {
        return await this.fetchMaintenanceWindows(opts.request, opts.spaceId, now);
      } catch (err) {
        // return default settings on error
        this.options.logger.debug(`Failed to fetch initial maintenance windows: ${err.message}`);
        return [];
      }
    }
  }

  public async loadMaintenanceWindows(
    opts: LoadMaintenanceWindowsOpts
  ): Promise<MaintenanceWindowData> {
    const activeMaintenanceWindows = await this.getMaintenanceWindows({
      request: opts.request,
      spaceId: opts.spaceId,
    });

    // Only look at maintenance windows for this rule category
    const maintenanceWindows = activeMaintenanceWindows.filter(({ categoryIds }) => {
      // If category IDs array doesn't exist: allow all
      if (!Array.isArray(categoryIds)) {
        return true;
      }
      // If category IDs array exist: check category
      if ((categoryIds as string[]).includes(opts.ruleTypeCategory)) {
        return true;
      }
      return false;
    });

    // Set the event log MW Id field the first time with MWs without scoped queries
    const maintenanceWindowsWithoutScopedQueryIds = filterMaintenanceWindowsIds({
      maintenanceWindows,
      withScopedQuery: false,
    });

    if (maintenanceWindowsWithoutScopedQueryIds.length) {
      opts.eventLogger.setMaintenanceWindowIds(maintenanceWindowsWithoutScopedQueryIds);
    }

    return { maintenanceWindows, maintenanceWindowsWithoutScopedQueryIds };
  }

  private async fetchMaintenanceWindows(
    request: KibanaRequest,
    spaceId: string,
    now: number
  ): Promise<MaintenanceWindow[]> {
    return await withAlertingSpan('alerting:load-maintenance-windows', async () => {
      const maintenanceWindowClient = this.options.getMaintenanceWindowClientWithRequest(request);
      const activeMaintenanceWindows = await maintenanceWindowClient.getActiveMaintenanceWindows();
      this.windows.set(spaceId, {
        lastUpdated: now,
        activeMaintenanceWindows,
      });
      return activeMaintenanceWindows;
    });
  }
}
