/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { StartPlugins } from '../../../plugin';
import { scheduleAssetCriticalityEcsCompliancyMigration } from '../asset_criticality/migrations/schedule_ecs_compliancy_migration';

export interface EntityAnalyticsMigrationsParams {
  taskManager?: TaskManagerSetupContract;
  logger: Logger;
  getStartServices: StartServicesAccessor<StartPlugins>;
  auditLogger: AuditLogger | undefined;
}

export const scheduleEntityAnalyticsMigration = async (params: EntityAnalyticsMigrationsParams) => {
  const scopedLogger = params.logger.get('entityAnalytics.migration');

  await scheduleAssetCriticalityEcsCompliancyMigration({ ...params, logger: scopedLogger });
};
