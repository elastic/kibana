/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup, NotificationsStart, ThemeServiceStart } from '@kbn/core/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import * as utils from '../../../../common/utils/risk_score_modules';
import type { inputsModel } from '../../../common/store';

import {
  deleteStoredScripts,
  deleteTransforms,
  deleteIngestPipelines,
  bulkDeletePrebuiltSavedObjects,
  installRiskScore,
  bulkCreatePrebuiltSavedObjects,
  stopTransforms,
  startTransforms,
} from '../../deprecated_risk_engine/api';
import {
  INGEST_PIPELINE_DELETION_ERROR_MESSAGE,
  TRANSFORM_DELETION_ERROR_MESSAGE,
  UNINSTALLATION_ERROR,
} from '../../deprecated_risk_engine/api/translations';

interface InstallRiskScoreModule {
  dashboard?: DashboardStart;
  http: HttpSetup;
  notifications?: NotificationsStart;
  refetch?: inputsModel.Refetch;
  renderDashboardLink?: (message: string, dashboardUrl: string) => React.ReactNode;
  renderDocLink?: (message: string) => React.ReactNode;
  riskScoreEntity: RiskScoreEntity;
  spaceId?: string;
  theme?: ThemeServiceStart;
  timerange: {
    from: string;
    to: string;
  };
}

type UpgradeRiskScoreModule = InstallRiskScoreModule;

const installHostRiskScoreModule = async ({
  dashboard,
  http,
  notifications,
  refetch,
  renderDashboardLink,
  renderDocLink,
  theme,
  timerange,
}: InstallRiskScoreModule) => {
  await installRiskScore({
    http,
    renderDocLink,
    notifications,
    options: {
      riskScoreEntity: RiskScoreEntity.host,
    },
  });

  // Install dashboards and relevant saved objects
  await bulkCreatePrebuiltSavedObjects({
    http,
    theme,
    dashboard,
    renderDashboardLink,
    renderDocLink,
    ...timerange,
    notifications,
    options: {
      templateName: `${RiskScoreEntity.host}RiskScoreDashboards`,
    },
  });

  if (refetch) {
    refetch();
  }
};

const installUserRiskScoreModule = async ({
  dashboard,
  http,
  notifications,
  refetch,
  renderDashboardLink,
  renderDocLink,
  spaceId = 'default',
  theme,
  timerange,
}: InstallRiskScoreModule) => {
  await installRiskScore({
    http,
    renderDocLink,
    notifications,
    options: {
      riskScoreEntity: RiskScoreEntity.user,
    },
  });

  // Install dashboards and relevant saved objects
  await bulkCreatePrebuiltSavedObjects({
    dashboard,
    http,
    notifications,
    options: {
      templateName: `${RiskScoreEntity.user}RiskScoreDashboards`,
    },
    renderDashboardLink,
    renderDocLink,
    ...timerange,
    theme,
  });

  if (refetch) {
    refetch();
  }
};

export const installRiskScoreModule = async (settings: InstallRiskScoreModule) => {
  if (settings.riskScoreEntity === RiskScoreEntity.user) {
    await installUserRiskScoreModule(settings);
  } else {
    await installHostRiskScoreModule(settings);
  }
};

export const uninstallRiskScoreModule = async ({
  http,
  notifications,
  refetch,
  renderDocLink,
  riskScoreEntity,
  spaceId = 'default',
  theme,
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  refetch?: inputsModel.Refetch;
  renderDocLink?: (message: string) => React.ReactNode;
  riskScoreEntity: RiskScoreEntity;
  spaceId?: string;
  theme?: ThemeServiceStart;
  deleteAll?: boolean;
}) => {
  const legacyTransformIds = [
    // transform Ids never changed since 8.3
    utils.getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    utils.getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];
  const legacyRiskScoreHostsScriptIds = [
    // 8.4
    utils.getLegacyRiskScoreLevelScriptId(RiskScoreEntity.host),
    utils.getLegacyRiskScoreInitScriptId(RiskScoreEntity.host),
    utils.getLegacyRiskScoreMapScriptId(RiskScoreEntity.host),
    utils.getLegacyRiskScoreReduceScriptId(RiskScoreEntity.host),
    // 8.3 and after 8.5
    utils.getRiskScoreLevelScriptId(RiskScoreEntity.host, spaceId),
    utils.getRiskScoreInitScriptId(RiskScoreEntity.host, spaceId),
    utils.getRiskScoreMapScriptId(RiskScoreEntity.host, spaceId),
    utils.getRiskScoreReduceScriptId(RiskScoreEntity.host, spaceId),
  ];
  const legacyRiskScoreUsersScriptIds = [
    // 8.4
    utils.getLegacyRiskScoreLevelScriptId(RiskScoreEntity.user),
    utils.getLegacyRiskScoreMapScriptId(RiskScoreEntity.user),
    utils.getLegacyRiskScoreReduceScriptId(RiskScoreEntity.user),
    // 8.3 and after 8.5
    utils.getRiskScoreLevelScriptId(RiskScoreEntity.user, spaceId),
    utils.getRiskScoreMapScriptId(RiskScoreEntity.user, spaceId),
    utils.getRiskScoreReduceScriptId(RiskScoreEntity.user, spaceId),
  ];

  const legacyIngestPipelineNames = [
    // 8.4
    utils.getLegacyIngestPipelineName(riskScoreEntity),
    // 8.3 and 8.5
    utils.getIngestPipelineName(riskScoreEntity, spaceId),
  ];

  await Promise.all([
    /**
     * Intended not to pass notification to bulkDeletePrebuiltSavedObjects.
     * As the only error it can happen is saved object not found, and
     * that is what bulkDeletePrebuiltSavedObjects wants.
     * (Before 8.5 once an saved object was created, it was shared across different spaces.
     * If it has been upgrade in one space, "saved object not found" will happen when upgrading other spaces.
     * Or it could be users manually deleted the saved object.)
     */
    bulkDeletePrebuiltSavedObjects({
      http,
      options: {
        templateName: `${riskScoreEntity}RiskScoreDashboards`,
      },
    }),
    deleteTransforms({
      http,
      theme,
      renderDocLink,
      notifications,
      errorMessage: `${UNINSTALLATION_ERROR} - ${TRANSFORM_DELETION_ERROR_MESSAGE(
        legacyTransformIds.length
      )}`,
      transformIds: legacyTransformIds,
      options: {
        deleteDestIndex: true,
        deleteDestDataView: true,
        forceDelete: false,
      },
    }),
    /**
     * Intended not to pass notification to deleteIngestPipelines.
     * As the only error it can happen is ingest pipeline not found, and
     * that is what deleteIngestPipelines wants.
     * (Before 8.5 once an ingest pipeline was created, it was shared across different spaces.
     * If it has been upgrade in one space, "ingest pipeline not found" will happen when upgrading other spaces.
     * Or it could be users manually deleted the ingest pipeline.)
     */
    deleteIngestPipelines({
      http,
      errorMessage: `${UNINSTALLATION_ERROR} - ${INGEST_PIPELINE_DELETION_ERROR_MESSAGE(
        legacyIngestPipelineNames.length
      )}`,
      names: legacyIngestPipelineNames.join(','),
    }),
    /**
     * Intended not to pass notification to deleteStoredScripts.
     * As the only error it can happen is script not found, and
     * that is what deleteStoredScripts wants.
     * (In 8.4 once a script was created, it was shared across different spaces.
     * If it has been upgrade in one space, "script not found" will happen when upgrading other spaces.
     * Or it could be users manually deleted the script.)
     */
    deleteStoredScripts({
      http,
      ids:
        riskScoreEntity === RiskScoreEntity.user
          ? legacyRiskScoreUsersScriptIds
          : legacyRiskScoreHostsScriptIds,
    }),
  ]);

  if (refetch) {
    refetch();
  }
};

export const upgradeHostRiskScoreModule = async ({
  dashboard,
  http,
  notifications,
  refetch,
  renderDashboardLink,
  renderDocLink,
  spaceId = 'default',
  theme,
  timerange,
}: UpgradeRiskScoreModule) => {
  await uninstallRiskScoreModule({
    http,
    notifications,
    renderDocLink,
    riskScoreEntity: RiskScoreEntity.host,
    spaceId,
    theme,
  });
  await installRiskScoreModule({
    dashboard,
    http,
    notifications,
    refetch,
    renderDashboardLink,
    renderDocLink,
    riskScoreEntity: RiskScoreEntity.host,
    spaceId,
    theme,
    timerange,
  });
};

export const upgradeUserRiskScoreModule = async ({
  dashboard,
  http,
  notifications,
  refetch,
  renderDashboardLink,
  renderDocLink,
  spaceId = 'default',
  theme,
  timerange,
}: UpgradeRiskScoreModule) => {
  await uninstallRiskScoreModule({
    http,
    notifications,
    renderDocLink,
    riskScoreEntity: RiskScoreEntity.user,
    spaceId,
    theme,
  });
  await installRiskScoreModule({
    dashboard,
    http,
    notifications,
    refetch,
    renderDashboardLink,
    renderDocLink,
    riskScoreEntity: RiskScoreEntity.user,
    spaceId,
    theme,
    timerange,
  });
};

export const restartRiskScoreTransforms = async ({
  http,
  notifications,
  refetch,
  renderDocLink,
  riskScoreEntity,
  spaceId,
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  refetch?: inputsModel.Refetch;
  renderDocLink?: (message: string) => React.ReactNode;
  riskScoreEntity: RiskScoreEntity;
  spaceId?: string;
}) => {
  const transformIds = [
    utils.getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    utils.getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];

  await stopTransforms({
    http,
    notifications,
    renderDocLink,
    transformIds,
  });

  const res = await startTransforms({
    http,
    notifications,
    renderDocLink,
    transformIds,
  });

  if (refetch) {
    refetch();
  }

  return res;
};
