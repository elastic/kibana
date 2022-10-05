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
  createIngestPipeline,
  createIndices,
  createStoredScript,
  createTransform,
  startTransforms,
  deleteStoredScripts,
  deleteTransforms,
  deleteIngestPipelines,
  stopTransforms,
  bulkCreatePrebuiltSavedObjects,
  bulkDeletePrebuiltSavedObjects,
} from '../../containers/onboarding/api';
import {
  INGEST_PIPELINE_DELETION_ERROR_MESSAGE,
  INSTALLATION_ERROR,
  START_TRANSFORMS_ERROR_MESSAGE,
  TRANSFORM_CREATION_ERROR_MESSAGE,
  TRANSFORM_DELETION_ERROR_MESSAGE,
  UNINSTALLATION_ERROR,
} from '../../containers/onboarding/api/translations';

interface InstallRiskyScoreModule {
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

type UpgradeRiskyScoreModule = InstallRiskyScoreModule;

const installHostRiskScoreModule = async ({
  dashboard,
  http,
  notifications,
  refetch,
  renderDashboardLink,
  renderDocLink,
  spaceId = 'default',
  theme,
  timerange,
}: InstallRiskyScoreModule) => {
  /**
   * console_templates/enable_host_risk_score.console
   * Step 1 Upload script: ml_hostriskscore_levels_script_{spaceId}
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskHostCreateLevelScriptOptions(spaceId),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 2 Upload script: ml_hostriskscore_init_script_{spaceId}
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskHostCreateInitScriptOptions(spaceId),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 3 Upload script: ml_hostriskscore_map_script_{spaceId}
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskHostCreateMapScriptOptions(spaceId),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 4 Upload script: ml_hostriskscore_reduce_script_{spaceId}
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskHostCreateReduceScriptOptions(spaceId),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 5 Upload the ingest pipeline: ml_hostriskscore_ingest_pipeline_{spaceId}
   */
  await createIngestPipeline({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskScoreIngestPipelineOptions(RiskScoreEntity.host, spaceId),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 6 create ml_host_risk_score_{spaceId} index
   */
  await createIndices({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getCreateRiskScoreIndicesOptions({
      spaceId,
      riskScoreEntity: RiskScoreEntity.host,
    }),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 7 create transform: ml_hostriskscore_pivot_transform_{spaceId}
   */
  await createTransform({
    http,
    theme,
    renderDocLink,
    notifications,
    errorMessage: `${INSTALLATION_ERROR} - ${TRANSFORM_CREATION_ERROR_MESSAGE}`,
    transformId: utils.getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId),
    options: utils.getCreateMLHostPivotTransformOptions({ spaceId }),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 9 create ml_host_risk_score_latest_{spaceId} index
   */
  await createIndices({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getCreateRiskScoreLatestIndicesOptions({
      spaceId,
      riskScoreEntity: RiskScoreEntity.host,
    }),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 10 create transform: ml_hostriskscore_latest_transform_{spaceId}
   */
  await createTransform({
    http,
    theme,
    renderDocLink,
    notifications,
    errorMessage: `${INSTALLATION_ERROR} - ${TRANSFORM_CREATION_ERROR_MESSAGE}`,
    transformId: utils.getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId),
    options: utils.getCreateLatestTransformOptions({
      spaceId,
      riskScoreEntity: RiskScoreEntity.host,
    }),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 8 Start the pivot transform
   * Step 11 Start the latest transform
   */
  const transformIds = [
    utils.getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId),
    utils.getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId),
  ];
  await startTransforms({
    http,
    theme,
    renderDocLink,
    notifications,
    errorMessage: `${INSTALLATION_ERROR} - ${START_TRANSFORMS_ERROR_MESSAGE(transformIds.length)}`,
    transformIds,
  });

  await restartRiskScoreTransforms({
    http,
    notifications,
    refetch,
    renderDocLink,
    riskScoreEntity: RiskScoreEntity.host,
    spaceId,
    theme,
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
}: InstallRiskyScoreModule) => {
  /**
   * console_templates/enable_user_risk_score.console
   * Step 1 Upload script: ml_userriskscore_levels_script_{spaceId}
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskUserCreateLevelScriptOptions(spaceId),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 2 Upload script: ml_userriskscore_map_script_{spaceId}
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskUserCreateMapScriptOptions(spaceId),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 3 Upload script: ml_userriskscore_reduce_script_{spaceId}
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskUserCreateReduceScriptOptions(spaceId),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 4 Upload ingest pipeline: ml_userriskscore_ingest_pipeline_{spaceId}
   */
  await createIngestPipeline({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskScoreIngestPipelineOptions(RiskScoreEntity.user, spaceId),
  });
  /**
   * console_templates/enable_user_risk_score.console
   * Step 5 create ml_user_risk_score_{spaceId} index
   */
  await createIndices({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getCreateRiskScoreIndicesOptions({
      spaceId,
      riskScoreEntity: RiskScoreEntity.user,
    }),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 6 create Transform: ml_userriskscore_pivot_transform_{spaceId}
   */
  await createTransform({
    http,
    theme,
    renderDocLink,
    notifications,
    errorMessage: `${INSTALLATION_ERROR} - ${TRANSFORM_CREATION_ERROR_MESSAGE}`,
    transformId: utils.getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId),
    options: utils.getCreateMLUserPivotTransformOptions({ spaceId }),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 8 create ml_user_risk_score_latest_{spaceId} index
   */
  await createIndices({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getCreateRiskScoreLatestIndicesOptions({
      spaceId,
      riskScoreEntity: RiskScoreEntity.user,
    }),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 9 create Transform: ml_userriskscore_latest_transform_{spaceId}
   */
  await createTransform({
    http,
    theme,
    renderDocLink,
    notifications,
    errorMessage: `${INSTALLATION_ERROR} - ${TRANSFORM_CREATION_ERROR_MESSAGE}`,
    transformId: utils.getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId),
    options: utils.getCreateLatestTransformOptions({
      spaceId,
      riskScoreEntity: RiskScoreEntity.user,
    }),
  });
  /**
   * console_templates/enable_user_risk_score.console
   * Step 7 Start the pivot transform
   * Step 10 Start the latest transform
   */
  const transformIds = [
    utils.getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId),
    utils.getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId),
  ];
  await startTransforms({
    errorMessage: `${INSTALLATION_ERROR} - ${START_TRANSFORMS_ERROR_MESSAGE(transformIds.length)}`,
    http,
    notifications,
    renderDocLink,
    theme,
    transformIds,
  });

  /**
   * Restart transform immediately to force it pick up the alerts data.
   * This can effectively reduce the chance of no data appears once installation complete.
   * */
  await restartRiskScoreTransforms({
    http,
    notifications,
    refetch,
    renderDocLink,
    riskScoreEntity: RiskScoreEntity.user,
    spaceId,
    theme,
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

export const installRiskScoreModule = async (settings: InstallRiskyScoreModule) => {
  if (settings.riskScoreEntity === RiskScoreEntity.user) {
    await installUserRiskScoreModule(settings);
  } else {
    await installHostRiskScoreModule(settings);
  }
};

export const uninstallLegacyRiskScoreModule = async ({
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
    utils.getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    utils.getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];
  const legacyRiskScoreHostsScriptIds = [
    utils.getLegacyRiskScoreLevelScriptId(RiskScoreEntity.host),
    utils.getLegacyRiskScoreInitScriptId(RiskScoreEntity.host),
    utils.getLegacyRiskScoreMapScriptId(RiskScoreEntity.host),
    utils.getLegacyRiskScoreReduceScriptId(RiskScoreEntity.host),
  ];
  const legacyRiskScoreUsersScriptIds = [
    utils.getLegacyRiskScoreLevelScriptId(RiskScoreEntity.user),
    utils.getLegacyRiskScoreMapScriptId(RiskScoreEntity.user),
    utils.getLegacyRiskScoreReduceScriptId(RiskScoreEntity.user),
  ];

  const legacyIngestPipelineNames = [utils.getLegacyIngestPipelineName(riskScoreEntity)];

  /**
   * Intended not to pass notification to bulkDeletePrebuiltSavedObjects.
   * As the only error it can happen is saved object not found, and
   * that is what bulkDeletePrebuiltSavedObjects wants.
   * (Before 8.5 once an saved object was created, it was shared across different spaces.
   * If it has been upgrade in one space, "saved object not found" will happen when upgrading other spaces.
   * Or it could be users manually deleted the saved object.)
   */
  await bulkDeletePrebuiltSavedObjects({
    http,
    options: {
      templateName: `${riskScoreEntity}RiskScoreDashboards`,
    },
  });

  await deleteTransforms({
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
  });

  /**
   * Intended not to pass notification to deleteIngestPipelines.
   * As the only error it can happen is ingest pipeline not found, and
   * that is what deleteIngestPipelines wants.
   * (Before 8.5 once an ingest pipeline was created, it was shared across different spaces.
   * If it has been upgrade in one space, "ingest pipeline not found" will happen when upgrading other spaces.
   * Or it could be users manually deleted the ingest pipeline.)
   */
  await deleteIngestPipelines({
    http,
    errorMessage: `${UNINSTALLATION_ERROR} - ${INGEST_PIPELINE_DELETION_ERROR_MESSAGE(
      legacyIngestPipelineNames.length
    )}`,
    names: legacyIngestPipelineNames.join(','),
  });

  /**
   * Intended not to pass notification to deleteStoredScripts.
   * As the only error it can happen is script not found, and
   * that is what deleteStoredScripts wants.
   * (Before 8.5 once a script was created, it was shared across different spaces.
   * If it has been upgrade in one space, "script not found" will happen when upgrading other spaces.
   * Or it could be users manually deleted the script.)
   */
  await deleteStoredScripts({
    http,
    ids:
      riskScoreEntity === RiskScoreEntity.user
        ? legacyRiskScoreUsersScriptIds
        : legacyRiskScoreHostsScriptIds,
  });

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
}: UpgradeRiskyScoreModule) => {
  await uninstallLegacyRiskScoreModule({
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
}: UpgradeRiskyScoreModule) => {
  await uninstallLegacyRiskScoreModule({
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
  theme,
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  refetch?: inputsModel.Refetch;
  renderDocLink?: (message: string) => React.ReactNode;
  riskScoreEntity: RiskScoreEntity;
  spaceId?: string;
  theme?: ThemeServiceStart;
}) => {
  const transformIds = [
    utils.getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    utils.getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];

  await stopTransforms({
    http,
    notifications,
    renderDocLink,
    theme,
    transformIds,
  });

  const res = await startTransforms({
    http,
    notifications,
    renderDocLink,
    theme,
    transformIds,
  });

  if (refetch) {
    refetch();
  }

  return res;
};
