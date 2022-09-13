/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreEntity } from '../../../../common/search_strategy';
import {
  getCreateLatestTransformOptions,
  getCreateMLHostPivotTransformOptions,
  getCreateMLUserPivotTransformOptions,
  getCreateRiskScoreIndicesOptions,
  getCreateRiskScoreLatestIndicesOptions,
  getRiskScoreIngestPipelineOptions,
  getRiskScoreLatestTransformId,
  getRiskScorePivotTransformId,
  getRiskyHostCreateInitScriptOptions,
  getRiskyHostCreateLevelScriptOptions,
  getRiskyHostCreateMapScriptOptions,
  getRiskyHostCreateReduceScriptOptions,
  getRiskyUserCreateLevelScriptOptions,
  getRiskyUserCreateMapScriptOptions,
  getRiskyUserCreateReduceScriptOptions,
} from '../../../../common/utils/risky_score_modules';

const getRiskyHostPrebuiltDevToolsContent = ({ spaceId = 'default' }: { spaceId?: string }) => {
  const riskScoreEntity = RiskScoreEntity.host;
  const stringifyScript = true;
  return {
    spaceId,
    createLevelScriptOptions: getRiskyHostCreateLevelScriptOptions(stringifyScript),
    createInitScriptOptions: getRiskyHostCreateInitScriptOptions(stringifyScript),
    createMapScriptOptions: getRiskyHostCreateMapScriptOptions(stringifyScript),
    createReduceScriptOptions: getRiskyHostCreateReduceScriptOptions(stringifyScript),
    createIngestPipelineOptions: getRiskScoreIngestPipelineOptions(
      riskScoreEntity,
      stringifyScript
    ),
    createRiskScoreIndicesOptions: getCreateRiskScoreIndicesOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
    createRiskScoreLatestIndicesOptions: getCreateRiskScoreLatestIndicesOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
    pivotTransformId: getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    pivotTransformOptions: getCreateMLHostPivotTransformOptions({
      spaceId,
      stringifyScript,
    }),
    latestTransformId: getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
    latestTransformOptions: getCreateLatestTransformOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
  };
};

const getRiskyUserPrebuiltDevToolsContent = ({ spaceId = 'default' }: { spaceId?: string }) => {
  const riskScoreEntity = RiskScoreEntity.user;
  const stringifyScript = true;
  return {
    spaceId,
    createLevelScriptOptions: getRiskyUserCreateLevelScriptOptions(stringifyScript),
    createMapScriptOptions: getRiskyUserCreateMapScriptOptions(stringifyScript),
    createReduceScriptOptions: getRiskyUserCreateReduceScriptOptions(stringifyScript),
    createIngestPipelineOptions: getRiskScoreIngestPipelineOptions(
      riskScoreEntity,
      stringifyScript
    ),
    createRiskScoreIndicesOptions: getCreateRiskScoreIndicesOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
    createRiskScoreLatestIndicesOptions: getCreateRiskScoreLatestIndicesOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
    pivotTransformId: getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    pivotTransformOptions: getCreateMLUserPivotTransformOptions({
      spaceId,
      stringifyScript,
    }),
    latestTransformId: getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
    latestTransformOptions: getCreateLatestTransformOptions({
      spaceId,
      riskScoreEntity,
      stringifyScript,
    }),
  };
};

export const getView = ({
  spaceId = 'default',
  riskScoreEntity,
}: {
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
}) => {
  if (riskScoreEntity === RiskScoreEntity.user) {
    return getRiskyUserPrebuiltDevToolsContent({ spaceId });
  }

  return getRiskyHostPrebuiltDevToolsContent({ spaceId });
};
