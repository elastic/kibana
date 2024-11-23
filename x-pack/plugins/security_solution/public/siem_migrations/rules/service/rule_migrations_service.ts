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
import type { RuleMigrationAllTaskStats } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { getRuleMigrationsStatsAll } from '../api/api';
import { getSuccessToast } from './success_notification';

const POLLING_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rulesService.polling.errorTitle',
  { defaultMessage: 'Error fetching rule migrations' }
);

export class SiemRulesMigrationsService {
  private readonly pollingInterval = 5000;
  private readonly latestStats$: BehaviorSubject<RuleMigrationAllTaskStats>;
  private isPolling = false;

  constructor(private readonly core: CoreStart) {
    this.latestStats$ = new BehaviorSubject<RuleMigrationAllTaskStats>([]);
    this.startPolling();
  }

  public getLatestStats$(): Observable<RuleMigrationAllTaskStats> {
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
      const results = await getRuleMigrationsStatsAll({ signal: new AbortController().signal });
      this.latestStats$.next(results);

      if (pendingMigrationIds.length > 0) {
        // send notifications for finished migrations
        pendingMigrationIds.forEach((pendingMigrationId) => {
          const migration = results.find((item) => item.migration_id === pendingMigrationId);
          if (migration && migration.status === 'finished') {
            this.core.notifications.toasts.addSuccess(getSuccessToast(migration, this.core));
          }
        });
      }

      // reassign pending migrations
      pendingMigrationIds = results.reduce<string[]>((acc, item) => {
        if (item.status === 'running') {
          acc.push(item.migration_id);
        }
        return acc;
      }, []);

      await new Promise((resolve) => setTimeout(resolve, this.pollingInterval));
    } while (pendingMigrationIds.length > 0);
  }
}
