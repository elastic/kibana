/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { TraceOptions } from '@kbn/elastic-assistant/impl/assistant/types';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  TRACE_OPTIONS_SESSION_STORAGE_KEY,
} from '@kbn/elastic-assistant/impl/assistant_context/constants';
import type { LangSmithOptions } from '../../../../common/siem_migrations/model/common.gen';
import type { RuleMigrationTaskStats } from '../../../../common/siem_migrations/model/rule_migration.gen';
import type {
  CreateRuleMigrationRequestBody,
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
  getRuleMigrationStats,
  getRuleMigrationsStatsAll,
  startRuleMigration,
} from '../api/api';
import type { RuleMigrationStats } from '../types';
import { getSuccessToast } from './success_notification';
import { RuleMigrationsStorage } from './storage';
import * as i18n from './translations';

// use the default assistant namespace since it's the only one we use
const NAMESPACE_TRACE_OPTIONS_SESSION_STORAGE_KEY =
  `${DEFAULT_ASSISTANT_NAMESPACE}.${TRACE_OPTIONS_SESSION_STORAGE_KEY}` as const;

const REQUEST_POLLING_INTERVAL_MS = 5000 as const;
const CREATE_MIGRATION_BODY_BATCH_SIZE = 50 as const;

export class SiemRulesMigrationsService {
  private readonly latestStats$: BehaviorSubject<RuleMigrationStats[]>;
  private isPolling = false;
  public connectorIdStorage = new RuleMigrationsStorage<string>('connectorId');
  public traceOptionsStorage = new RuleMigrationsStorage<TraceOptions>('traceOptions', {
    customKey: NAMESPACE_TRACE_OPTIONS_SESSION_STORAGE_KEY,
    storageType: 'session',
  });

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

  public async createRuleMigration(body: CreateRuleMigrationRequestBody): Promise<string> {
    if (body.length === 0) {
      throw new Error(i18n.EMPTY_RULES_ERROR);
    }
    // Batching creation to avoid hitting the max payload size limit of the API
    let migrationId: string | undefined;
    for (let i = 0; i < body.length; i += CREATE_MIGRATION_BODY_BATCH_SIZE) {
      const bodyBatch = body.slice(i, i + CREATE_MIGRATION_BODY_BATCH_SIZE);
      const response = await createRuleMigration({ migrationId, body: bodyBatch });
      migrationId = response.migration_id;
    }
    return migrationId as string;
  }

  public async startRuleMigration(migrationId: string): Promise<GetAllStatsRuleMigrationResponse> {
    const connectorId = this.connectorIdStorage.get();
    if (!connectorId) {
      throw new Error(i18n.MISSING_CONNECTOR_ERROR);
    }

    const langSmithSettings = this.traceOptionsStorage.get();
    let langSmithOptions: LangSmithOptions | undefined;
    if (langSmithSettings) {
      langSmithOptions = {
        project_name: langSmithSettings.langSmithProject,
        api_key: langSmithSettings.langSmithApiKey,
      };
    }

    const result = await startRuleMigration({ migrationId, connectorId, langSmithOptions });
    this.startPolling();
    return result;
  }

  public async getRuleMigrationStats(migrationId: string): Promise<GetRuleMigrationStatsResponse> {
    return getRuleMigrationStats({ migrationId });
  }

  public async getRuleMigrationsStats(
    params: GetRuleMigrationsStatsAllParams = {}
  ): Promise<RuleMigrationStats[]> {
    const allStats = await this.getRuleMigrationsStatsWithRetry(params);
    const results = allStats.map(
      // the array order (by creation) is guaranteed by the API
      (stats, index) => ({ ...stats, number: index + 1 } as RuleMigrationStats) // needs cast because of the `status` enum override
    );
    this.latestStats$.next(results); // Always update the latest stats
    return results;
  }

  private async getRuleMigrationsStatsWithRetry(
    params: GetRuleMigrationsStatsAllParams = {},
    sleepSecs?: number
  ): Promise<RuleMigrationTaskStats[]> {
    if (sleepSecs) {
      await new Promise((resolve) => setTimeout(resolve, sleepSecs * 1000));
    }

    return getRuleMigrationsStatsAll(params).catch((e) => {
      // Retry only on network errors (no status) and 503s, otherwise throw
      if (e.status && e.status !== 503) {
        throw e;
      }
      const nextSleepSecs = sleepSecs ? sleepSecs * 2 : 1; // Exponential backoff
      if (nextSleepSecs > 60) {
        // Wait for a minutes max (two minutes total) for the API to be available again
        throw e;
      }
      return this.getRuleMigrationsStatsWithRetry(params, nextSleepSecs);
    });
  }

  private async startTaskStatsPolling(): Promise<void> {
    let pendingMigrationIds: string[] = [];
    do {
      const results = await this.getRuleMigrationsStats();

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
