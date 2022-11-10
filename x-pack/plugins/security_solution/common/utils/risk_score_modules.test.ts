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

describe.each([[RiskScoreEntity.host], [RiskScoreEntity.user]])('Risk Score Modules', (entity) => {
  test(`getRiskScorePivotTransformId - ${entity}`, () => {
    const id = getRiskScorePivotTransformId(entity, mockSpaceId);
    expect(id).toMatchInlineSnapshot(`"ml_${entity}riskscore_pivot_transform_customSpaceId"`);
  });
  test(`getIngestPipelineName - ${entity}`, () => {
    const name = getIngestPipelineName(entity);
    expect(name).toMatchInlineSnapshot(`"ml_${entity}riskscore_ingest_pipeline_default"`);
  });
  test(`getPivotTransformIndex - ${entity}`, () => {
    const index = getPivotTransformIndex(entity, mockSpaceId);
    expect(index).toMatchInlineSnapshot(`"ml_${entity}_risk_score_customSpaceId"`);
  });
  test(`getLatestTransformIndex - ${entity}`, () => {
    const index = getLatestTransformIndex(entity, mockSpaceId);
    expect(index).toMatchInlineSnapshot(`"ml_${entity}_risk_score_latest_customSpaceId"`);
  });
  test(`getRiskScoreLevelScriptId - ${entity}`, () => {
    const index = getRiskScoreLevelScriptId(entity);
    expect(index).toMatchInlineSnapshot(`"ml_${entity}riskscore_levels_script_default"`);
  });
  test(`getRiskScoreInitScriptId - ${entity}`, () => {
    const index = getRiskScoreInitScriptId(entity);
    expect(index).toMatchInlineSnapshot(`"ml_${entity}riskscore_init_script_default"`);
  });
  test(`getRiskScoreMapScriptId - ${entity}`, () => {
    const index = getRiskScoreMapScriptId(entity);
    expect(index).toMatchInlineSnapshot(`"ml_${entity}riskscore_map_script_default"`);
  });
  test(`getRiskScoreReduceScriptId - ${entity}`, () => {
    const index = getRiskScoreReduceScriptId(entity);
    expect(index).toMatchInlineSnapshot(`"ml_${entity}riskscore_reduce_script_default"`);
  });
  test(`getLegacyIngestPipelineName - ${entity}`, () => {
    const name = getLegacyIngestPipelineName(entity);
    expect(name).toMatchInlineSnapshot(`"ml_${entity}riskscore_ingest_pipeline"`);
  });
  test(`getLegacyRiskScoreLevelScriptId - ${entity}`, () => {
    const index = getLegacyRiskScoreLevelScriptId(entity);
    expect(index).toMatchInlineSnapshot(`"ml_${entity}riskscore_levels_script"`);
  });
  test(`getLegacyRiskScoreInitScriptId - ${entity}`, () => {
    const index = getLegacyRiskScoreInitScriptId(entity);
    expect(index).toMatchInlineSnapshot(`"ml_${entity}riskscore_init_script"`);
  });
  test(`getLegacyRiskScoreMapScriptId - ${entity}`, () => {
    const index = getLegacyRiskScoreMapScriptId(entity);
    expect(index).toMatchInlineSnapshot(`"ml_${entity}riskscore_map_script"`);
  });
  test(`getLegacyRiskScoreReduceScriptId - ${entity}`, () => {
    const index = getLegacyRiskScoreReduceScriptId(entity);
    expect(index).toMatchInlineSnapshot(`"ml_${entity}riskscore_reduce_script"`);
  });
  test(`getRiskScoreIngestPipelineOptions - ${entity}`, () => {
    const options = getRiskScoreIngestPipelineOptions(entity);
    expect(options).toMatchSnapshot();
  });
  test(`getCreateRiskScoreIndicesOptions - ${entity}`, () => {
    const options = getCreateRiskScoreIndicesOptions({
      spaceId: mockSpaceId,
      riskScoreEntity: entity,
    });
    expect(options).toMatchSnapshot();
  });
  test(`getCreateRiskScoreLatestIndicesOptions - ${entity}`, () => {
    const options = getCreateRiskScoreLatestIndicesOptions({
      spaceId: mockSpaceId,
      riskScoreEntity: entity,
    });
    expect(options).toMatchSnapshot();
  });
  test(`getCreateLatestTransformOptions - ${entity}`, () => {
    const options = getCreateLatestTransformOptions({
      spaceId: mockSpaceId,
      riskScoreEntity: entity,
    });
    expect(options).toMatchSnapshot();
  });
  test(`getCreateML${
    entity.charAt(0).toUpperCase() + entity.slice(1)
  }PivotTransformOptions`, () => {
    const fn =
      entity === RiskScoreEntity.host
        ? getCreateMLHostPivotTransformOptions
        : getCreateMLUserPivotTransformOptions;
    const options = fn({
      spaceId: mockSpaceId,
    });
    expect(options).toMatchSnapshot();
  });
  test(`getRisk${entity.charAt(0).toUpperCase() + entity.slice(1)}CreateLevelScriptOptions`, () => {
    const fn =
      entity === RiskScoreEntity.host
        ? getRiskHostCreateLevelScriptOptions
        : getRiskUserCreateLevelScriptOptions;
    const options = fn();
    expect(options).toMatchSnapshot();
  });
  test(`getRisk${entity.charAt(0).toUpperCase() + entity.slice(1)}CreateMapScriptOptions`, () => {
    const fn =
      entity === RiskScoreEntity.host
        ? getRiskHostCreateMapScriptOptions
        : getRiskUserCreateMapScriptOptions;
    const options = fn();
    expect(options).toMatchSnapshot();
  });
  test(`getRisk${
    entity.charAt(0).toUpperCase() + entity.slice(1)
  }CreateReduceScriptOptions`, () => {
    const fn =
      entity === RiskScoreEntity.host
        ? getRiskHostCreateReduceScriptOptions
        : getRiskUserCreateReduceScriptOptions;
    const options = fn();
    expect(options).toMatchSnapshot();
  });

  /**
   * User risk score doesn't have init script, so we only check for host
   */
  if (entity === RiskScoreEntity.host) {
    test(`getRiskHostCreateInitScriptOptions`, () => {
      const options = getRiskHostCreateInitScriptOptions();
      expect(options).toMatchSnapshot();
    });
  }
});
