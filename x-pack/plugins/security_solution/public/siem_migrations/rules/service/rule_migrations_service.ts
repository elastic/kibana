/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { ExperimentalFeaturesService } from '../../../common/experimental_features_service';
import { licenseService } from '../../../common/hooks/use_license';
import { getRuleMigrationsStatsAll } from '../api/api';
import type { RuleMigrationStats } from '../types';
import { getSuccessToast } from './success_notification';

const POLLING_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rulesService.polling.errorTitle',
  { defaultMessage: 'Error fetching rule migrations' }
);

export class SiemRulesMigrationsService {
  private readonly pollingInterval = 5000;
  private readonly latestStats$: BehaviorSubject<RuleMigrationStats[]>;
  private isPolling = false;

  constructor(private readonly core: CoreStart) {
    this.latestStats$ = new BehaviorSubject<RuleMigrationStats[]>([]);
    this.startPolling();
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
    this.startStatsPolling()
      .catch((e) => {
        this.core.notifications.toasts.addError(e, { title: POLLING_ERROR_TITLE });
      })
      .finally(() => {
        this.isPolling = false;
      });
  }

  private async startStatsPolling(): Promise<void> {
    let pendingMigrationIds: string[] = [];
    do {
      const results = await this.fetchRuleMigrationsStats();
      this.latestStats$.next(results);

      if (pendingMigrationIds.length > 0) {
        // send notifications for finished migrations
        pendingMigrationIds.forEach((pendingMigrationId) => {
          const migration = results.find((item) => item.id === pendingMigrationId);
          if (migration && migration.status === 'finished') {
            this.core.notifications.toasts.addSuccess(getSuccessToast(migration, this.core));
          }
        });
      }

      // reassign pending migrations
      pendingMigrationIds = results.reduce<string[]>((acc, item) => {
        if (item.status === 'running') {
          acc.push(item.id);
        }
        return acc;
      }, []);

      await new Promise((resolve) => setTimeout(resolve, this.pollingInterval));
    } while (pendingMigrationIds.length > 0);
  }

  private async fetchRuleMigrationsStats(): Promise<RuleMigrationStats[]> {
    const stats = await getRuleMigrationsStatsAll({ signal: new AbortController().signal });
    return stats.map((stat, index) => ({ ...stat, number: index + 1 })); // the array order (by creation) is guaranteed by the API
  }
}
