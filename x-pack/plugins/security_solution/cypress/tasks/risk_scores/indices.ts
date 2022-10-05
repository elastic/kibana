/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreEntity } from './common';

export const getPivotTransformIndex = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}_risk_score_${spaceId}`;

export const getLatestTransformIndex = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}_risk_score_latest_${spaceId}`;

export const getCreateLegacyRiskScoreIndicesOptions = ({
  spaceId = 'default',
  riskScoreEntity,
}: {
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
}) => {
  const mappings = {
    properties: {
      [`${riskScoreEntity}.name`]: {
        type: 'keyword',
      },
      '@timestamp': {
        type: 'date',
      },
      ingest_timestamp: {
        type: 'date',
      },
      risk: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      risk_stats: {
        properties: {
          risk_score: {
            type: 'float',
          },
        },
      },
    },
  };
  return {
    index: getPivotTransformIndex(riskScoreEntity, spaceId),
    mappings,
  };
};

export const getCreateLegacyRiskScoreLatestIndicesOptions = ({
  spaceId = 'default',
  riskScoreEntity,
}: {
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
}) => {
  const mappings = {
    properties: {
      [`${riskScoreEntity}.name`]: {
        type: 'keyword',
      },
      '@timestamp': {
        type: 'date',
      },
      ingest_timestamp: {
        type: 'date',
      },
      risk: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      risk_stats: {
        properties: {
          risk_score: {
            type: 'float',
          },
        },
      },
    },
  };
  return {
    index: getLatestTransformIndex(riskScoreEntity, spaceId),
    mappings,
  };
};
