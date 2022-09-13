/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import * as utils from '../../../../../common/utils/risky_score_modules';
import { bulkCreatePrebuiltSavedObjects } from '../../../../common/components/create_prebuilt_saved_objects/apis/bulk_create_prebuilt_saved_objects';
import { bulkDeletePrebuiltSavedObjects } from '../../../../common/components/create_prebuilt_saved_objects/apis/bulk_delete_prebuilt_saved_objects';
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
} from './api';
import {
  INGEST_PIPELINE_DELETION_ERROR_MESSAGE,
  INSTALLATION_ERROR,
  START_TRANSFORMS_ERROR_MESSAGE,
  TRANSFORM_CREATION_ERROR_MESSAGE,
  TRANSFORM_DELETION_ERROR_MESSAGE,
  UNINSTALLATION_ERROR,
} from './api/translations';

export enum InstallationState {
  Started = 'STARTED',
  Done = 'DONE',
}

export enum UpgradeState {
  Started = 'STARTED',
  Done = 'DONE',
}

export enum RestartState {
  Started = 'STARTED',
  Done = 'DONE',
}

export const installHostRiskScoreModule = async ({
  http,
  notifications,
  spaceId = 'default',
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
}) => {
  /**
   * console_templates/enable_host_risk_score.console
   * Step 1 Upload script: ml_hostriskscore_levels_script
   */
  await createStoredScript({
    http,
    notifications,
    options: utils.getRiskyHostCreateLevelScriptOptions(),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 2 Upload script: ml_hostriskscore_init_script
   */
  await createStoredScript({
    http,
    notifications,
    options: utils.getRiskyHostCreateInitScriptOptions(),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 3 Upload script: ml_hostriskscore_map_script
   */
  await createStoredScript({
    http,
    notifications,
    options: utils.getRiskyHostCreateMapScriptOptions(),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 4 Upload script: ml_hostriskscore_reduce_script
   */
  await createStoredScript({
    http,
    notifications,
    options: utils.getRiskyHostCreateReduceScriptOptions(),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 5 Upload the ingest pipeline: ml_hostriskscore_ingest_pipeline
   */
  await createIngestPipeline({
    http,
    notifications,
    options: utils.getRiskScoreIngestPipelineOptions(RiskScoreEntity.host),
  });

  /**
   * console_templates/enable_host_risk_score.console
   * Step 6 create ml_host_risk_score_{spaceId} index
   */
  await createIndices({
    http,
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
  await startTransforms({
    http,
    errorMessage: `${INSTALLATION_ERROR} - ${START_TRANSFORMS_ERROR_MESSAGE}`,
    transformIds: [
      utils.getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId),
      utils.getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId),
    ],
  });

  await bulkCreatePrebuiltSavedObjects({
    http,
    notifications,
    options: {
      templateName: `${RiskScoreEntity.host}RiskScoreDashboards`,
    },
  });
};

export const installUserRiskScoreModule = async ({
  http,
  notifications,
  spaceId = 'default',
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
}) => {
  /**
   * console_templates/enable_user_risk_score.console
   * Step 1 Upload script: ml_userriskscore_levels_script
   */
  await createStoredScript({
    http,
    notifications,
    options: utils.getRiskyUserCreateLevelScriptOptions(),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 2 Upload script: ml_userriskscore_map_script
   */
  await createStoredScript({
    http,
    notifications,
    options: utils.getRiskyUserCreateMapScriptOptions(),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 3 Upload script: ml_userriskscore_reduce_script
   */
  await createStoredScript({
    http,
    notifications,
    options: utils.getRiskyUserCreateReduceScriptOptions(),
  });

  /**
   * console_templates/enable_user_risk_score.console
   * Step 4 Upload ingest pipeline: ml_userriskscore_ingest_pipeline
   */
  await createIngestPipeline({
    http,
    notifications,
    options: utils.getRiskScoreIngestPipelineOptions(RiskScoreEntity.user),
  });
  /**
   * console_templates/enable_user_risk_score.console
   * Step 5 create ml_user_risk_score_{spaceId} index
   */
  await createIndices({
    http,
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
  await startTransforms({
    http,
    errorMessage: `${INSTALLATION_ERROR} - ${START_TRANSFORMS_ERROR_MESSAGE}`,
    transformIds: [
      utils.getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId),
      utils.getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId),
    ],
  });

  await bulkCreatePrebuiltSavedObjects({
    http,
    notifications,
    options: {
      templateName: `${RiskScoreEntity.user}RiskScoreDashboards`,
    },
  });
};

export const uninstallRiskScoreModule = async ({
  http,
  notifications,
  spaceId = 'default',
  riskScoreEntity,
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
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

  await deleteStoredScripts({
    http,
    notifications,
    ids: riskScoreEntity === RiskScoreEntity.user ? riskyUsersScriptIds : riskyHostsScriptIds,
  });

  await deleteTransforms({
    http,
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
  const names = utils.getIngestPipelineName(riskScoreEntity);
  const count = names.split(',').length;

  await deleteIngestPipelines({
    http,
    notifications,
    errorMessage: `${UNINSTALLATION_ERROR} - ${INGEST_PIPELINE_DELETION_ERROR_MESSAGE(count)}`,
    names,
  });
};

export const upgradeHostRiskScoreModule = async ({
  http,
  notifications,
  spaceId = 'default',
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
}) => {
  await uninstallRiskScoreModule({
    http,
    notifications,
    spaceId,
    riskScoreEntity: RiskScoreEntity.host,
  });
  await installHostRiskScoreModule({
    http,
    notifications,
    spaceId,
  });
};

export const upgradeUserRiskScoreModule = async ({
  http,
  notifications,
  spaceId = 'default',
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
}) => {
  await uninstallRiskScoreModule({
    http,
    notifications,
    spaceId,
    riskScoreEntity: RiskScoreEntity.user,
  });
  await installUserRiskScoreModule({
    http,
    notifications,
    spaceId,
  });
};

export const restartRiskScoreTransforms = async ({
  http,
  notifications,
  spaceId,
  riskScoreEntity,
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
}) => {
  const transformIds = [
    utils.getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    utils.getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];

  await stopTransforms({
    http,
    notifications,
    transformIds,
  });

  const res = await startTransforms({
    http,
    notifications,
    transformIds,
  });

  return res;
};
