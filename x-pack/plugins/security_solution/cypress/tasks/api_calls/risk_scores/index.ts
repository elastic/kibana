/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ANALYTICS_URL } from '../../../urls/navigation';
import { RISK_SCORE_URL } from '../../../urls/risk_score';
import { visit } from '../../login';
import { RiskScoreEntity } from '../../risk_scores/common';
import {
  getLegacyRiskScoreIndicesOptions,
  getLegacyRiskScoreLatestIndicesOptions,
} from '../../risk_scores/indices';
import {
  getIngestPipelineName,
  getLegacyIngestPipelineName,
  getLegacyRiskScoreIngestPipelineOptions,
} from '../../risk_scores/ingest_pipelines';
import {
  getLegacyRiskHostCreateInitScriptOptions,
  getLegacyRiskHostCreateLevelScriptOptions,
  getLegacyRiskHostCreateMapScriptOptions,
  getLegacyRiskHostCreateReduceScriptOptions,
  getLegacyRiskScoreInitScriptId,
  getLegacyRiskScoreLevelScriptId,
  getLegacyRiskScoreMapScriptId,
  getLegacyRiskScoreReduceScriptId,
  getLegacyRiskUserCreateLevelScriptOptions,
  getLegacyRiskUserCreateMapScriptOptions,
  getLegacyRiskUserCreateReduceScriptOptions,
  getRiskScoreInitScriptId,
  getRiskScoreLevelScriptId,
  getRiskScoreMapScriptId,
  getRiskScoreReduceScriptId,
} from '../../risk_scores/stored_scripts';
import {
  createTransform,
  deleteTransforms,
  getCreateLegacyLatestTransformOptions,
  getCreateLegacyMLHostPivotTransformOptions,
  getCreateLegacyMLUserPivotTransformOptions,
  getRiskScoreLatestTransformId,
  getRiskScorePivotTransformId,
  startTransforms,
} from '../../risk_scores/transforms';
import { createIndex, deleteRiskScoreIndicies } from './indices';
import { createIngestPipeline, deleteRiskScoreIngestPipelines } from './ingest_pipelines';
import { deleteSavedObjects } from './saved_objects';
import { createStoredScript, deleteStoredScripts } from './stored_scripts';

/**
 * @deleteAll: If set to true, it deletes both old and new version.
 * If set to false, it deletes legacy version only.
 */
export const deleteRiskScore = ({
  riskScoreEntity,
  spaceId,
  deleteAll,
}: {
  riskScoreEntity: RiskScoreEntity;
  spaceId?: string;
  deleteAll: boolean;
}) => {
  const transformIds = [
    getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];
  const legacyIngestPipelineNames = [getLegacyIngestPipelineName(riskScoreEntity)];
  const ingestPipelinesNames = deleteAll
    ? [...legacyIngestPipelineNames, getIngestPipelineName(riskScoreEntity, spaceId)]
    : legacyIngestPipelineNames;

  const legacyScriptIds = [
    ...(riskScoreEntity === RiskScoreEntity.host
      ? [getLegacyRiskScoreInitScriptId(riskScoreEntity)]
      : []),
    getLegacyRiskScoreLevelScriptId(riskScoreEntity),
    getLegacyRiskScoreMapScriptId(riskScoreEntity),
    getLegacyRiskScoreReduceScriptId(riskScoreEntity),
  ];
  const scripts = deleteAll
    ? [
        ...legacyScriptIds,
        ...(riskScoreEntity === RiskScoreEntity.host
          ? [getRiskScoreInitScriptId(riskScoreEntity, spaceId)]
          : []),
        getRiskScoreLevelScriptId(riskScoreEntity, spaceId),
        getRiskScoreMapScriptId(riskScoreEntity, spaceId),
        getRiskScoreReduceScriptId(riskScoreEntity, spaceId),
      ]
    : legacyScriptIds;

  deleteTransforms(transformIds);
  deleteRiskScoreIngestPipelines(ingestPipelinesNames);
  deleteStoredScripts(scripts);
  deleteSavedObjects(`${riskScoreEntity}RiskScoreDashboards`, deleteAll);
  deleteRiskScoreIndicies(riskScoreEntity, spaceId);
};

const installLegacyHostRiskScoreModule = (spaceId: string) => {
  /**
   * Step 1 Upload script: ml_hostriskscore_levels_script
   */
  createStoredScript(getLegacyRiskHostCreateLevelScriptOptions())
    .then(() => {
      /**
       * Step 2 Upload script: ml_hostriskscore_init_script
       */
      return createStoredScript(getLegacyRiskHostCreateInitScriptOptions());
    })
    .then(() => {
      /**
       * Step 3 Upload script: ml_hostriskscore_map_script
       */
      return createStoredScript(getLegacyRiskHostCreateMapScriptOptions());
    })
    .then(() => {
      /**
       * Step 4 Upload script: ml_hostriskscore_reduce_script
       */
      return createStoredScript(getLegacyRiskHostCreateReduceScriptOptions());
    })
    .then(() => {
      /**
       * Step 5 Upload the ingest pipeline: ml_hostriskscore_ingest_pipeline
       */
      return createIngestPipeline(getLegacyRiskScoreIngestPipelineOptions(RiskScoreEntity.host));
    })
    .then(() => {
      /**
       * Step 6 create ml_host_risk_score_{spaceId} index
       */
      return createIndex(
        getLegacyRiskScoreIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.host,
        })
      );
    })
    .then(() => {
      /**
       * Step 7 create transform: ml_hostriskscore_pivot_transform_{spaceId}
       */
      return createTransform(
        getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId),
        getCreateLegacyMLHostPivotTransformOptions({ spaceId })
      );
    })
    .then(() => {
      /**
       * Step 8 create ml_host_risk_score_latest_{spaceId} index
       */
      return createIndex(
        getLegacyRiskScoreLatestIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.host,
        })
      );
    })
    .then(() => {
      /**
       * Step 9 create transform: ml_hostriskscore_latest_transform_{spaceId}
       */
      return createTransform(
        getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId),
        getCreateLegacyLatestTransformOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.host,
        })
      );
    })
    .then(() => {
      /**
       * Step 10 Start the pivot transform
       * Step 11 Start the latest transform
       */
      const transformIds = [
        getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId),
        getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId),
      ];
      return startTransforms(transformIds);
    })
    .then(() => {
      // refresh page
      visit(ENTITY_ANALYTICS_URL);
    });
};

const installLegacyUserRiskScoreModule = async (spaceId = 'default') => {
  /**
   * Step 1 Upload script: ml_userriskscore_levels_script
   */
  createStoredScript(getLegacyRiskUserCreateLevelScriptOptions())
    .then(() => {
      /**
       * Step 2 Upload script: ml_userriskscore_map_script
       */
      return createStoredScript(getLegacyRiskUserCreateMapScriptOptions());
    })
    .then(() => {
      /**
       * Step 3 Upload script: ml_userriskscore_reduce_script
       */
      return createStoredScript(getLegacyRiskUserCreateReduceScriptOptions());
    })
    .then(() => {
      /**
       * Step 4 Upload ingest pipeline: ml_userriskscore_ingest_pipeline
       */
      return createIngestPipeline(getLegacyRiskScoreIngestPipelineOptions(RiskScoreEntity.user));
    })
    .then(() => {
      /**
       * Step 5 create ml_user_risk_score_{spaceId} index
       */
      return createIndex(
        getLegacyRiskScoreIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.user,
        })
      );
    })
    .then(() => {
      /**
       * Step 6 create Transform: ml_userriskscore_pivot_transform_{spaceId}
       */
      return createTransform(
        getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId),
        getCreateLegacyMLUserPivotTransformOptions({ spaceId })
      );
    })
    .then(() => {
      /**
       * Step 7 create ml_user_risk_score_latest_{spaceId} index
       */
      return createIndex(
        getLegacyRiskScoreLatestIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.user,
        })
      );
    })
    .then(() => {
      /**
       * Step 8 create Transform: ml_userriskscore_latest_transform_{spaceId}
       */
      return createTransform(
        getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId),
        getCreateLegacyLatestTransformOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.user,
        })
      );
    })
    .then(() => {
      /**
       * Step 9 Start the pivot transform
       * Step 10 Start the latest transform
       */
      const transformIds = [
        getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId),
        getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId),
      ];
      return startTransforms(transformIds);
    })
    .then(() => {
      visit(ENTITY_ANALYTICS_URL);
    });
};

export const installLegacyRiskScoreModule = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default'
) => {
  if (riskScoreEntity === RiskScoreEntity.user) {
    installLegacyUserRiskScoreModule(spaceId);
  } else {
    installLegacyHostRiskScoreModule(spaceId);
  }
};

export const intercepInstallRiskScoreModule = () => {
  cy.intercept(`POST`, RISK_SCORE_URL).as('install');
};

export const waitForInstallRiskScoreModule = () => {
  cy.wait(['@install'], { requestTimeout: 50000 });
};
