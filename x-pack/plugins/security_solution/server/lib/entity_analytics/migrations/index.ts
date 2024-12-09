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
import { updateAssetCriticalityMappings } from '../asset_criticality/migrations/update_asset_criticality_mappings';
import { updateRiskScoreMappings } from '../risk_engine/migrations/update_risk_score_mappings';

export interface EntityAnalyticsMigrationsParams {
  taskManager?: TaskManagerSetupContract;
  logger: Logger;
  getStartServices: StartServicesAccessor<StartPlugins>;
  auditLogger: AuditLogger | undefined;
  kibanaVersion: string;
}

export const scheduleEntityAnalyticsMigration = async (params: EntityAnalyticsMigrationsParams) => {
  const scopedLogger = params.logger.get('entityAnalytics.migration');

  await updateAssetCriticalityMappings({ ...params, logger: scopedLogger });
  await scheduleAssetCriticalityEcsCompliancyMigration({ ...params, logger: scopedLogger });
  await updateRiskScoreMappings({ ...params, logger: scopedLogger });
};
