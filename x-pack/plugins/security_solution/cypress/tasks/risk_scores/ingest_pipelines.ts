/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreEntity } from './common';
import { getLegacyRiskScoreLevelScriptId, getRiskScoreLevelScriptId } from './stored_scripts';

export const getIngestPipelineName = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_ingest_pipeline_${spaceId}`;

export const getLegacyIngestPipelineName = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_ingest_pipeline`;

export const getLegacyRiskScoreIngestPipelineOptions = (
  riskScoreEntity: RiskScoreEntity,
  version = '8.4'
) => {
  const processors = [
    {
      set: {
        field: 'ingest_timestamp',
        value: '{{_ingest.timestamp}}',
      },
    },
    {
      fingerprint: {
        fields: ['@timestamp', '_id'],
        method: 'SHA-256',
        target_field: '_id',
      },
    },
    {
      script: {
        id:
          version === '8.4'
            ? getLegacyRiskScoreLevelScriptId(riskScoreEntity)
            : getRiskScoreLevelScriptId(riskScoreEntity),
        params: {
          risk_score: 'risk_stats.risk_score',
        },
      },
    },
  ];
  return {
    name:
      version === '8.4'
        ? getLegacyIngestPipelineName(riskScoreEntity)
        : getIngestPipelineName(riskScoreEntity),
    processors,
  };
};
