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
  getPivoTransformIndex,
  getRiskScoreIngestPipelineOptions,
  getRiskScorePivotTransformId,
  getRiskyHostCreateInitScriptOptions,
  getRiskyHostCreateLevelScriptOptions,
  getRiskyHostCreateMapScriptOptions,
  getRiskyHostCreateReduceScriptOptions,
  getRiskyScoreInitScriptId,
  getRiskyScoreLevelScriptId,
  getRiskyScoreMapScriptId,
  getRiskyScoreReduceScriptId,
  getRiskyUserCreateLevelScriptOptions,
  getRiskyUserCreateMapScriptOptions,
  getRiskyUserCreateReduceScriptOptions,
} from './risky_score_modules';

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
    expect(name).toMatchInlineSnapshot(`"ml_hostriskscore_ingest_pipeline"`);
  });

  test('getIngestPipelineName - user', () => {
    const name = getIngestPipelineName(RiskScoreEntity.user);
    expect(name).toMatchInlineSnapshot(`"ml_userriskscore_ingest_pipeline"`);
  });
});

describe('getPivoTransformIndex', () => {
  test('getPivoTransformIndex - host', () => {
    const index = getPivoTransformIndex(RiskScoreEntity.host, mockSpaceId);
    expect(index).toMatchInlineSnapshot(`"ml_host_risk_score_customSpaceId"`);
  });

  test('getPivoTransformIndex - user', () => {
    const index = getPivoTransformIndex(RiskScoreEntity.user, mockSpaceId);
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

describe('getRiskyScoreLevelScriptId', () => {
  test('getRiskyScoreLevelScriptId - host', () => {
    const index = getRiskyScoreLevelScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_levels_script"`);
  });

  test('getRiskyScoreLevelScriptId - user', () => {
    const index = getRiskyScoreLevelScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_levels_script"`);
  });
});

describe('getRiskyScoreInitScriptId', () => {
  test('getRiskyScoreInitScriptId - host', () => {
    const index = getRiskyScoreInitScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_init_script"`);
  });

  test('getRiskyScoreInitScriptId - user', () => {
    const index = getRiskyScoreInitScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_init_script"`);
  });
});

describe('getRiskyScoreMapScriptId', () => {
  test('getRiskyScoreMapScriptId - host', () => {
    const index = getRiskyScoreMapScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_map_script"`);
  });

  test('getRiskyScoreMapScriptId - user', () => {
    const index = getRiskyScoreMapScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_map_script"`);
  });
});

describe('getRiskyScoreReduceScriptId', () => {
  test('getRiskyScoreReduceScriptId - host', () => {
    const index = getRiskyScoreReduceScriptId(RiskScoreEntity.host);
    expect(index).toMatchInlineSnapshot(`"ml_hostriskscore_reduce_script"`);
  });

  test('getRiskyScoreReduceScriptId - user', () => {
    const index = getRiskyScoreReduceScriptId(RiskScoreEntity.user);
    expect(index).toMatchInlineSnapshot(`"ml_userriskscore_reduce_script"`);
  });
});

describe('getRiskyHostCreateLevelScriptOptions', () => {
  const options = getRiskyHostCreateLevelScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskyHostCreateInitScriptOptions', () => {
  const options = getRiskyHostCreateInitScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskyHostCreateMapScriptOptions', () => {
  const options = getRiskyHostCreateMapScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskyHostCreateReduceScriptOptions', () => {
  const options = getRiskyHostCreateReduceScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskyUserCreateLevelScriptOptions', () => {
  const options = getRiskyUserCreateLevelScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskyUserCreateMapScriptOptions', () => {
  const options = getRiskyUserCreateMapScriptOptions();
  expect(options).toMatchSnapshot();
});

describe('getRiskyUserCreateReduceScriptOptions', () => {
  const options = getRiskyUserCreateReduceScriptOptions();
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
