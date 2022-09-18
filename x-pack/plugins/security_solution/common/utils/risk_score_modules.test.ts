/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreEntity } from '../search_strategy';
import {
  getCreateLatestTransformOptions,
  getCreateMLHostPivotTransformOptions,
  getCreateMLUserPivotTransformOptions,
  getCreateRiskScoreIndicesOptions,
  getCreateRiskScoreLatestIndicesOptions,
  getIngestPipelineName,
  getLatestTransformIndex,
  getPivotTransformIndex,
  getRiskScoreIngestPipelineOptions,
  getRiskScorePivotTransformId,
  getRiskHostCreateInitScriptOptions,
  getRiskHostCreateLevelScriptOptions,
  getRiskHostCreateMapScriptOptions,
  getRiskHostCreateReduceScriptOptions,
  getRiskScoreInitScriptId,
  getRiskScoreLevelScriptId,
  getRiskScoreMapScriptId,
  getRiskScoreReduceScriptId,
  getRiskUserCreateLevelScriptOptions,
  getRiskUserCreateMapScriptOptions,
  getRiskUserCreateReduceScriptOptions,
  getLegacyIngestPipelineName,
  getLegacyRiskScoreLevelScriptId,
  getLegacyRiskScoreInitScriptId,
  getLegacyRiskScoreMapScriptId,
  getLegacyRiskScoreReduceScriptId,
} from './risk_score_modules';

const mockSpaceId = 'customSpaceId';
describe('getRiskScorePivotTransformId', () => {
  test('getRiskScorePivotTransformId - host', () => {
    const id = getRiskScorePivotTransformId(RiskScoreEntity.host, mockSpaceId);
    expect(id).toMatchInlineSnapshot(`"ml_hostriskscore_pivot_transform_customSpaceId"`);
  });

  test('getRiskScorePivotTransformId - user', () => {
    const id = getRiskScorePivotTransformId(RiskScoreEntity.user, mockSpaceId);
    expect(id).toMatchInlineSnapshot(`"ml_userriskscore_pivot_transform_customSpaceId"`);
  });
});

describe('getIngestPipelineName', () => {
  test('getIngestPipelineName - host', () => {
    const name = getIngestPipelineName(RiskScoreEntity.host);
    expect(name).toMatchInlineSnapshot(`"ml_hostriskscore_ingest_pipeline_default"`);
  });

  test('getIngestPipelineName - user', () => {
    const name = getIngestPipelineName(RiskScoreEntity.user);
    expect(name).toMatchInlineSnapshot(`"ml_userriskscore_ingest_pipeline_default"`);
  });
});

describe('getPivotTransformIndex', () => {
  test('getPivotTransformIndex - host', () => {
    const index = getPivotTransformIndex(RiskScoreEntity.host, mockSpaceId);
    expect(index).toMatchInlineSnapshot(`"ml_host_risk_score_customSpaceId"`);
  });

  test('getPivotTransformIndex - user', () => {
    const index = getPivotTransformIndex(RiskScoreEntity.user, mockSpaceId);
    expect(index).toMatchInlineSnapshot(`"ml_user_risk_score_customSpaceId"`);
  });
});

describe('getLatestTransformIndex', () => {
  test('getLatestTransformIndex - host', () => {
    const index = getLatestTransformIndex(RiskScoreEntity.host, mockSpaceId);
    expect(index).toMatchInlineSnapshot(`"ml_host_risk_score_latest_customSpaceId"`);
  });

  test('getLatestTransformIndex - user', () => {
    const index = getLatestTransformIndex(RiskScoreEntity.user, mockSpaceId);
    expect(index).toMatchInlineSnapshot(`"ml_user_risk_score_latest_customSpaceId"`);
  });
});

describe('getRiskScoreLevelScriptId', () => {
  test('getRiskScoreLevelScriptId - host', () => {
    const index = getRiskScoreLevelScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_levels_script_default"`);
  });

  test('getRiskScoreLevelScriptId - user', () => {
    const index = getRiskScoreLevelScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_levels_script_default"`);
  });
});

describe('getRiskScoreInitScriptId', () => {
  test('getRiskScoreInitScriptId - host', () => {
    const index = getRiskScoreInitScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_init_script_default"`);
  });

  test('getRiskScoreInitScriptId - user', () => {
    const index = getRiskScoreInitScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_init_script_default"`);
  });
});

describe('getRiskScoreMapScriptId', () => {
  test('getRiskScoreMapScriptId - host', () => {
    const index = getRiskScoreMapScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_map_script_default"`);
  });

  test('getRiskScoreMapScriptId - user', () => {
    const index = getRiskScoreMapScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_map_script_default"`);
  });
});

describe('getRiskScoreReduceScriptId', () => {
  test('getRiskScoreReduceScriptId - host', () => {
    const index = getRiskScoreReduceScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_reduce_script_default"`);
  });

  test('getRiskScoreReduceScriptId - user', () => {
    const index = getRiskScoreReduceScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_reduce_script_default"`);
  });
});

describe('getLegacyIngestPipelineName', () => {
  test('getLegacyIngestPipelineName - host', () => {
    const name = getLegacyIngestPipelineName(RiskScoreEntity.host);
    expect(name).toMatchInlineSnapshot(`"ml_hostriskscore_ingest_pipeline"`);
  });

  test('getLegacyIngestPipelineName - user', () => {
    const name = getLegacyIngestPipelineName(RiskScoreEntity.user);
    expect(name).toMatchInlineSnapshot(`"ml_userriskscore_ingest_pipeline"`);
  });
});

describe('getLegacyRiskScoreLevelScriptId', () => {
  test('getLegacyRiskScoreLevelScriptId - host', () => {
    const index = getLegacyRiskScoreLevelScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_levels_script"`);
  });

  test('getLegacyRiskScoreLevelScriptId - user', () => {
    const index = getLegacyRiskScoreLevelScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_levels_script"`);
  });
});

describe('getLegacyRiskScoreInitScriptId', () => {
  test('getLegacyRiskScoreInitScriptId - host', () => {
    const index = getLegacyRiskScoreInitScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_init_script"`);
  });

  test('getLegacyRiskScoreInitScriptId - user', () => {
    const index = getLegacyRiskScoreInitScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_init_script"`);
  });
});

describe('getLegacyRiskScoreMapScriptId', () => {
  test('getLegacyRiskScoreMapScriptId - host', () => {
    const index = getLegacyRiskScoreMapScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_map_script"`);
  });

  test('getLegacyRiskScoreMapScriptId - user', () => {
    const index = getLegacyRiskScoreMapScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_map_script"`);
  });
});

describe('getLegacyRiskScoreReduceScriptId', () => {
  test('getLegacyRiskScoreReduceScriptId - host', () => {
    const index = getLegacyRiskScoreReduceScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_reduce_script"`);
  });

  test('getLegacyRiskScoreReduceScriptId - user', () => {
    const index = getLegacyRiskScoreReduceScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_reduce_script"`);
  });
});

describe('getRiskHostCreateLevelScriptOptions', () => {
  const options = getRiskHostCreateLevelScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskHostCreateInitScriptOptions', () => {
  const options = getRiskHostCreateInitScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskHostCreateMapScriptOptions', () => {
  const options = getRiskHostCreateMapScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskHostCreateReduceScriptOptions', () => {
  const options = getRiskHostCreateReduceScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskUserCreateLevelScriptOptions', () => {
  const options = getRiskUserCreateLevelScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskUserCreateMapScriptOptions', () => {
  const options = getRiskUserCreateMapScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskUserCreateReduceScriptOptions', () => {
  const options = getRiskUserCreateReduceScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskScoreIngestPipelineOptions', () => {
  test('getRiskScoreIngestPipelineOptions - host', () => {
    const options = getRiskScoreIngestPipelineOptions(RiskScoreEntity.host);
    expect(options).toMatchSnapshot();
  });

  test('getRiskScoreIngestPipelineOptions - user', () => {
    const options = getRiskScoreIngestPipelineOptions(RiskScoreEntity.user);
    expect(options).toMatchSnapshot();
  });
});

describe('getCreateRiskScoreIndicesOptions', () => {
  test('getCreateRiskScoreIndicesOptions - host', () => {
    const options = getCreateRiskScoreIndicesOptions({
      spaceId: mockSpaceId,
      riskScoreEntity: RiskScoreEntity.host,
    });
    expect(options).toMatchSnapshot();
  });

  test('getCreateRiskScoreIndicesOptions - user', () => {
    const options = getCreateRiskScoreIndicesOptions({
      spaceId: mockSpaceId,
      riskScoreEntity: RiskScoreEntity.user,
    });
    expect(options).toMatchSnapshot();
  });
});

describe('getCreateRiskScoreLatestIndicesOptions', () => {
  test('getCreateRiskScoreLatestIndicesOptions - host', () => {
    const options = getCreateRiskScoreLatestIndicesOptions({
      spaceId: mockSpaceId,
      riskScoreEntity: RiskScoreEntity.host,
    });
    expect(options).toMatchSnapshot();
  });

  test('getCreateRiskScoreLatestIndicesOptions - user', () => {
    const options = getCreateRiskScoreLatestIndicesOptions({
      spaceId: mockSpaceId,
      riskScoreEntity: RiskScoreEntity.user,
    });
    expect(options).toMatchSnapshot();
  });
});

describe('getCreateMLHostPivotTransformOptions', () => {
  test('getCreateMLHostPivotTransformOptions', () => {
    const options = getCreateMLHostPivotTransformOptions({
      spaceId: mockSpaceId,
    });
    expect(options).toMatchSnapshot();
  });
});

describe('getCreateMLUserPivotTransformOptions', () => {
  test('getCreateMLUserPivotTransformOptions', () => {
    const options = getCreateMLUserPivotTransformOptions({
      spaceId: mockSpaceId,
    });
    expect(options).toMatchSnapshot();
  });
});

describe('getCreateLatestTransformOptions', () => {
  test('getCreateLatestTransformOptions - host', () => {
    const options = getCreateLatestTransformOptions({
      spaceId: mockSpaceId,
      riskScoreEntity: RiskScoreEntity.host,
    });
    expect(options).toMatchSnapshot();
  });

  test('getCreateLatestTransformOptions - user', () => {
    const options = getCreateLatestTransformOptions({
      spaceId: mockSpaceId,
      riskScoreEntity: RiskScoreEntity.user,
    });
    expect(options).toMatchSnapshot();
  });
});
