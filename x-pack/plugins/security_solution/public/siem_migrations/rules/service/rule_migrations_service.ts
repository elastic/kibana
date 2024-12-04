/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import type { StartPluginsDependencies } from '../../../types';
import { ExperimentalFeaturesService } from '../../../common/experimental_features_service';
import { licenseService } from '../../../common/hooks/use_license';
import { getRuleMigrationsStatsAll, startRuleMigration } from '../api';
import type { RuleMigrationTask } from '../types';
import { getSuccessToast } from './success_notification';
import { RuleMigrationsStorage } from './storage';

export class SiemRulesMigrationsService {
  private readonly pollingInterval = 5000;
  private readonly latestStats$: BehaviorSubject<RuleMigrationTask[]>;
  private readonly signal = new AbortController().signal;
  private isPolling = false;
  public connectorIdStorage = new RuleMigrationsStorage('connectorId');

  constructor(
    private readonly core: CoreStart,
    private readonly plugins: StartPluginsDependencies
  ) {
    this.latestStats$ = new BehaviorSubject<RuleMigrationTask[]>([]);

    this.plugins.spaces.getActiveSpace().then((space) => {
      this.connectorIdStorage.setSpaceId(space.id);
      this.startPolling();
    });
  }

  public getLatestStats$(): Observable<RuleMigrationTask[]> {
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
    this.startStatsPolling()
      .catch((e) => {
        this.core.notifications.toasts.addError(e, {
          title: i18n.translate(
            'xpack.securitySolution.siemMigrations.rulesService.polling.errorTitle',
            { defaultMessage: 'Error fetching rule migrations' }
          ),
        });
      })
      .finally(() => {
        this.isPolling = false;
      });
  }

  private async startStatsPolling(): Promise<void> {
    let pendingMigrationIds: string[] = [];
    do {
      const results = await this.fetchRuleMigrationTasksStats();
      this.latestStats$.next(results);

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
            await startRuleMigration({
              migrationId: result.id,
              body: { connector_id: connectorId },
              signal: this.signal,
            });
            pendingMigrationIds.push(result.id);
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollingInterval));
    } while (pendingMigrationIds.length > 0);
  }

  private async fetchRuleMigrationTasksStats(): Promise<RuleMigrationTask[]> {
    const stats = await getRuleMigrationsStatsAll({ signal: this.signal });
    return stats.map((stat, index) => ({ ...stat, number: index + 1 })); // the array order (by creation) is guaranteed by the API
  }
}
