/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSFORMS_URL } from '../../urls/risk_score';
import { RiskScoreEntity } from './common';
import { getLatestTransformIndex, getPivotTransformIndex } from './indices';
import { getIngestPipelineName, getLegacyIngestPipelineName } from './ingest_pipelines';
import {
  getLegacyRiskScoreInitScriptId,
  getLegacyRiskScoreMapScriptId,
  getLegacyRiskScoreReduceScriptId,
  getRiskScoreInitScriptId,
  getRiskScoreMapScriptId,
  getRiskScoreReduceScriptId,
} from './stored_scripts';

const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts' as const;
const getAlertsIndex = (spaceId = 'default') => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

export const getRiskScorePivotTransformId = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default'
) => `ml_${riskScoreEntity}riskscore_pivot_transform_${spaceId}`;

export const getRiskScoreLatestTransformId = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default'
) => `ml_${riskScoreEntity}riskscore_latest_transform_${spaceId}`;

export const getTransformState = (transformId: string) => {
  return cy.request<{ transforms: Array<{ id: string; state: string }>; count: number }>({
    method: 'get',
    url: `${TRANSFORMS_URL}/transforms/${transformId}/_stats`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

export const startTransforms = (transformIds: string[]) => {
  return cy.request({
    method: 'post',
    url: `${TRANSFORMS_URL}/start_transforms`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    body: transformIds.map((id) => ({
      id,
    })),
  });
};

const stopTransform = (state: {
  transforms: Array<{ id: string; state: string }>;
  count: number;
}) => {
  return cy.request({
    method: 'post',
    url: `${TRANSFORMS_URL}/stop_transforms`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    body:
      state != null && state.transforms.length > 0
        ? [
            {
              id: state.transforms[0].id,
              state: state.transforms[0].state,
            },
          ]
        : ([] as Array<{ id: string; state: string }>),
  });
};

export const createTransform = (transformId: string, options: string | Record<string, unknown>) => {
  return cy.request({
    method: 'put',
    url: `${TRANSFORMS_URL}/transforms/${transformId}`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    body: options,
  });
};

const deleteTransform = (transformId: string) => {
  return cy.request({
    method: 'post',
    url: `${TRANSFORMS_URL}/delete_transforms`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    failOnStatusCode: false,
    body: {
      transformsInfo: [
        {
          id: transformId,
          state: 'stopped',
        },
      ],
      deleteDestIndex: true,
      deleteDestDataView: true,
      forceDelete: false,
    },
  });
};

export const deleteTransforms = (transformIds: string[]) => {
  const deleteSingleTransform = (transformId: string) =>
    getTransformState(transformId)
      .then(({ body: result }) => {
        return stopTransform(result);
      })
      .then(() => {
        deleteTransform(transformId);
      });

  transformIds.map((transformId) => deleteSingleTransform(transformId));
};

export const getCreateLegacyMLHostPivotTransformOptions = ({
  spaceId = 'default',
  version = '8.4',
}: {
  spaceId?: string;
  version?: '8.3' | '8.4';
}) => {
  const options = {
    dest: {
      index: getPivotTransformIndex(RiskScoreEntity.host, spaceId),
      pipeline:
        version === '8.4'
          ? getLegacyIngestPipelineName(RiskScoreEntity.host)
          : getIngestPipelineName(RiskScoreEntity.host, spaceId),
    },
    frequency: '1h',
    pivot: {
      aggregations: {
        '@timestamp': {
          max: {
            field: '@timestamp',
          },
        },
        risk_stats: {
          scripted_metric: {
            combine_script: 'return state',
            init_script: {
              id:
                version === '8.4'
                  ? getLegacyRiskScoreInitScriptId(RiskScoreEntity.host)
                  : getRiskScoreInitScriptId(RiskScoreEntity.host, spaceId),
            },
            map_script: {
              id:
                version === '8.4'
                  ? getLegacyRiskScoreMapScriptId(RiskScoreEntity.host)
                  : getRiskScoreMapScriptId(RiskScoreEntity.host, spaceId),
            },
            params: {
              lookback_time: 72,
              max_risk: 100,
              p: 1.5,
              server_multiplier: 1.5,
              tactic_base_multiplier: 0.25,
              tactic_weights: {
                TA0001: 1,
                TA0002: 2,
                TA0003: 3,
                TA0004: 4,
                TA0005: 4,
                TA0006: 4,
                TA0007: 4,
                TA0008: 5,
                TA0009: 6,
                TA0010: 7,
                TA0011: 6,
                TA0040: 8,
                TA0042: 1,
                TA0043: 1,
              },
              time_decay_constant: 6,
              zeta_constant: 2.612,
            },
            reduce_script: {
              id:
                version === '8.4'
                  ? getLegacyRiskScoreReduceScriptId(RiskScoreEntity.host)
                  : getRiskScoreReduceScriptId(RiskScoreEntity.host, spaceId),
            },
          },
        },
      },
      group_by: {
        [`${RiskScoreEntity.host}.name`]: {
          terms: {
            field: `${RiskScoreEntity.host}.name`,
          },
        },
      },
    },
    source: {
      index: [getAlertsIndex(spaceId)],
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-5d',
                },
              },
            },
          ],
        },
      },
    },
    sync: {
      time: {
        delay: '120s',
        field: '@timestamp',
      },
    },
  };

  return options;
};

export const getCreateLegacyMLUserPivotTransformOptions = ({
  spaceId = 'default',
  version = '8.4',
}: {
  spaceId?: string;
  version?: '8.3' | '8.4';
}) => {
  const options = {
    dest: {
      index: getPivotTransformIndex(RiskScoreEntity.user, spaceId),
      pipeline:
        version === '8.4'
          ? getLegacyIngestPipelineName(RiskScoreEntity.user)
          : getIngestPipelineName(RiskScoreEntity.user),
    },
    frequency: '1h',
    pivot: {
      aggregations: {
        '@timestamp': {
          max: {
            field: '@timestamp',
          },
        },
        risk_stats: {
          scripted_metric: {
            combine_script: 'return state',
            init_script: 'state.rule_risk_stats = new HashMap();',
            map_script: {
              id:
                version === '8.4'
                  ? getLegacyRiskScoreMapScriptId(RiskScoreEntity.user)
                  : getRiskScoreMapScriptId(RiskScoreEntity.user),
            },
            params: {
              max_risk: 100,
              p: 1.5,
              zeta_constant: 2.612,
            },
            reduce_script: {
              id:
                version === '8.4'
                  ? getLegacyRiskScoreReduceScriptId(RiskScoreEntity.user)
                  : getRiskScoreReduceScriptId(RiskScoreEntity.user),
            },
          },
        },
      },
      group_by: {
        'user.name': {
          terms: {
            field: 'user.name',
          },
        },
      },
    },
    source: {
      index: [getAlertsIndex(spaceId)],
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-90d',
                },
              },
            },
            {
              match: {
                'signal.status': 'open',
              },
            },
          ],
        },
      },
    },
    sync: {
      time: {
        delay: '120s',
        field: '@timestamp',
      },
    },
  };
  return options;
};

export const getCreateLegacyLatestTransformOptions = ({
  spaceId = 'default',
  riskScoreEntity,
}: {
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
}) => {
  const options = {
    dest: {
      index: getLatestTransformIndex(riskScoreEntity, spaceId),
    },
    frequency: '1h',
    latest: {
      sort: '@timestamp',
      unique_key: [`${riskScoreEntity}.name`],
    },
    source: {
      index: [getPivotTransformIndex(riskScoreEntity, spaceId)],
    },
    sync: {
      time: {
        delay: '2s',
        field: 'ingest_timestamp',
      },
    },
  };
  return options;
};
