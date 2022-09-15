/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup, NotificationsStart, ThemeServiceStart } from '@kbn/core/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import * as utils from '../../../../../common/utils/risky_score_modules';
import type { inputsModel } from '../../../../common/store';

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
} from '../../../../risk_score/containers/onboarding/api';
import {
  INGEST_PIPELINE_DELETION_ERROR_MESSAGE,
  INSTALLATION_ERROR,
  START_TRANSFORMS_ERROR_MESSAGE,
  TRANSFORM_CREATION_ERROR_MESSAGE,
  TRANSFORM_DELETION_ERROR_MESSAGE,
  UNINSTALLATION_ERROR,
} from '../../../../risk_score/containers/onboarding/api/translations';

interface InstallRiskyScoreModule {
  dashboard?: DashboardStart;
  http: HttpSetup;
  notifications?: NotificationsStart;
  refetch?: inputsModel.Refetch;
  renderDashboardLink?: (message: string, dashboardUrl: string) => React.ReactNode;
  renderDocLink?: (message: string) => React.ReactNode;
  spaceId?: string;
  theme?: ThemeServiceStart;
  timerange: {
    from: string;
    to: string;
  };
}

type UpgradeRiskyScoreModule = InstallRiskyScoreModule;

export const installHostRiskScoreModule = async ({
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
   * Step 1 Upload script: ml_hostriskscore_levels_script
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskyHostCreateLevelScriptOptions(),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 2 Upload script: ml_hostriskscore_init_script
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskyHostCreateInitScriptOptions(),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 3 Upload script: ml_hostriskscore_map_script
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskyHostCreateMapScriptOptions(),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 4 Upload script: ml_hostriskscore_reduce_script
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskyHostCreateReduceScriptOptions(),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 5 Upload the ingest pipeline: ml_hostriskscore_ingest_pipeline
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

export const installUserRiskScoreModule = async ({
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
   * Step 1 Upload script: ml_userriskscore_levels_script
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskyUserCreateLevelScriptOptions(),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 2 Upload script: ml_userriskscore_map_script
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskyUserCreateMapScriptOptions(),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 3 Upload script: ml_userriskscore_reduce_script
   */
  await createStoredScript({
    http,
    theme,
    renderDocLink,
    notifications,
    options: utils.getRiskyUserCreateReduceScriptOptions(),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 4 Upload ingest pipeline: ml_userriskscore_ingest_pipeline
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
}) => {
  const transformIds = [
    utils.getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    utils.getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];
  const riskyHostsScriptIds = [
    utils.getRiskyScoreLevelScriptId(RiskScoreEntity.host),
    utils.getRiskyScoreInitScriptId(RiskScoreEntity.host),
    utils.getRiskyScoreMapScriptId(RiskScoreEntity.host),
    utils.getRiskyScoreReduceScriptId(RiskScoreEntity.host),
  ];
  const riskyUsersScriptIds = [
    utils.getRiskyScoreLevelScriptId(RiskScoreEntity.user),
    utils.getRiskyScoreMapScriptId(RiskScoreEntity.user),
    utils.getRiskyScoreReduceScriptId(RiskScoreEntity.user),
  ];

  await bulkDeletePrebuiltSavedObjects({
    http,
    notifications,
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
      transformIds.length
    )}`,
    transformIds,
    options: {
      deleteDestIndex: true,
      deleteDestDataView: true,
      forceDelete: false,
    },
  });

  const names = utils.getIngestPipelineName(riskScoreEntity, spaceId);
  const count = names.split(',').length;

  await deleteIngestPipelines({
    http,
    theme,
    renderDocLink,
    notifications,
    errorMessage: `${UNINSTALLATION_ERROR} - ${INGEST_PIPELINE_DELETION_ERROR_MESSAGE(count)}`,
    names,
  });

  await deleteStoredScripts({
    http,
    theme,
    renderDocLink,
    notifications,
    ids: riskScoreEntity === RiskScoreEntity.user ? riskyUsersScriptIds : riskyHostsScriptIds,
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
  await uninstallRiskScoreModule({
    http,
    notifications,
    renderDocLink,
    riskScoreEntity: RiskScoreEntity.host,
    spaceId,
    theme,
  });
  await installHostRiskScoreModule({
    dashboard,
    http,
    notifications,
    refetch,
    renderDashboardLink,
    renderDocLink,
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
  await uninstallRiskScoreModule({
    http,
    notifications,
    renderDocLink,
    riskScoreEntity: RiskScoreEntity.user,
    spaceId,
    theme,
  });
  await installUserRiskScoreModule({
    dashboard,
    http,
    notifications,
    refetch,
    renderDashboardLink,
    renderDocLink,
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
