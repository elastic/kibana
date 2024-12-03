/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type {
  CreateRuleMigrationRequestBody,
  CreateRuleMigrationResponse,
  GetAllStatsRuleMigrationResponse,
  GetRuleMigrationStatsResponse,
} from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import type { StartPluginsDependencies } from '../../../types';
import { ExperimentalFeaturesService } from '../../../common/experimental_features_service';
import { licenseService } from '../../../common/hooks/use_license';
import type { GetRuleMigrationsStatsAllParams } from '../api/api';
import {
  createRuleMigration,
  getRuleMigrationsStats,
  getRuleMigrationsStatsAll,
  startRuleMigration,
} from '../api/api';
import type { RuleMigrationStats } from '../types';
import { getSuccessToast } from './success_notification';
import { RuleMigrationsStorage } from './storage';
import * as i18n from './translations';

const REQUEST_POLLING_INTERVAL_MS = 5000 as const;

export class SiemRulesMigrationsService {
  private readonly latestStats$: BehaviorSubject<RuleMigrationStats[]>;
  private isPolling = false;
  public connectorIdStorage = new RuleMigrationsStorage('connectorId');

  constructor(
    private readonly core: CoreStart,
    private readonly plugins: StartPluginsDependencies
  ) {
    this.latestStats$ = new BehaviorSubject<RuleMigrationStats[]>([]);

    this.plugins.spaces.getActiveSpace().then((space) => {
      this.connectorIdStorage.setSpaceId(space.id);
      this.startPolling();
    });
  }

  public getLatestStats$(): Observable<RuleMigrationStats[]> {
    return this.latestStats$.asObservable();
  }

  public isAvailable() {
    return ExperimentalFeaturesService.get().siemMigrationsEnabled && licenseService.isEnterprise();
  }

  public startPolling() {
    if (this.isPolling || !this.isAvailable()) {
      return;
    }
    this.isPolling = true;
    this.startTaskStatsPolling()
      .catch((e) => {
        this.core.notifications.toasts.addError(e, { title: i18n.POLLING_ERROR });
      })
      .finally(() => {
        this.isPolling = false;
      });
  }

  public async getRuleMigrationTasksStats(
    params: GetRuleMigrationsStatsAllParams = {}
  ): Promise<RuleMigrationStats[]> {
    const allStats = await getRuleMigrationsStatsAll(params);
    const results = allStats.map(
      (stats, index) =>
        ({
          ...stats,
          number: index + 1, // the array order (by creation) is guaranteed by the API
        } as RuleMigrationStats) // needs cast because of the `status` enum override
    );
    this.latestStats$.next(results); // Always update the latest stats
    return results;
  }

  public async createRuleMigration(
    body: CreateRuleMigrationRequestBody
  ): Promise<CreateRuleMigrationResponse> {
    const connectorId = this.connectorIdStorage.get();
    if (!connectorId) {
      throw new Error(i18n.MISSING_CONNECTOR_ERROR);
    }
    return createRuleMigration({ body });
  }

  public async getRuleMigrationsStats(migrationId: string): Promise<GetRuleMigrationStatsResponse> {
    return getRuleMigrationsStats({ migrationId });
  }

  public async startRuleMigration(migrationId: string): Promise<GetAllStatsRuleMigrationResponse> {
    const connectorId = this.connectorIdStorage.get();
    if (!connectorId) {
      throw new Error(i18n.MISSING_CONNECTOR_ERROR);
    }
    // TODO: add langsmith options from local storage
    const result = await startRuleMigration({ migrationId, connectorId });
    this.startPolling();
    return result;
  }

  private async startTaskStatsPolling(): Promise<void> {
    let pendingMigrationIds: string[] = [];
    do {
      const results = await this.getRuleMigrationTasksStats();

      if (pendingMigrationIds.length > 0) {
        // send notifications for finished migrations
        pendingMigrationIds.forEach((pendingMigrationId) => {
          const migration = results.find((item) => item.id === pendingMigrationId);
          if (migration?.status === SiemMigrationTaskStatus.FINISHED) {
            this.core.notifications.toasts.addSuccess(getSuccessToast(migration, this.core));
          }
        });
      }

      // reprocess pending migrations
      pendingMigrationIds = [];
      for (const result of results) {
        if (result.status === SiemMigrationTaskStatus.RUNNING) {
          pendingMigrationIds.push(result.id);
        }

        if (result.status === SiemMigrationTaskStatus.STOPPED) {
          const connectorId = this.connectorIdStorage.get();
          if (connectorId) {
            // automatically resume stopped migrations when connector is available
            await startRuleMigration({ migrationId: result.id, connectorId });
            pendingMigrationIds.push(result.id);
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, REQUEST_POLLING_INTERVAL_MS));
    } while (pendingMigrationIds.length > 0);
  }
}
