/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import {
  getIngestPipelineName,
  getRiskScoreLatestTransformId,
  getRiskScorePivotTransformId,
} from '../../../../../common/utils/risky_score_modules';
import { bulkDeletePrebuiltSavedObjects, bulkCreatePrebuiltSavedObjects } from './api';

import * as api from './api';
import {
  installHostRiskScoreModule,
  installUserRiskScoreModule,
  restartRiskScoreTransforms,
  uninstallRiskScoreModule,
} from './utils';

jest.mock('./api');

const mockHttp = {
  post: jest.fn(),
} as unknown as HttpSetup;
const mockSpaceId = 'customSpace';
const mockTimerange = {
  startDate: 'startDate',
  endDate: 'endDate',
};

describe('installHostRiskScoreModule', () => {
  beforeAll(async () => {
    await installHostRiskScoreModule({
      http: mockHttp,
      spaceId: mockSpaceId,
      timerange: mockTimerange,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it(`Create script: ml_${RiskScoreEntity.host}riskscore_levels_script`, async () => {
    expect((api.createStoredScript as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create script: ml_${RiskScoreEntity.host}riskscore_init_script`, async () => {
    expect((api.createStoredScript as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it(`Create script: ml_${RiskScoreEntity.host}riskscore_map_script`, async () => {
    expect((api.createStoredScript as jest.Mock).mock.calls[2][0].options).toMatchSnapshot();
  });

  it(`Create script: ml_${RiskScoreEntity.host}riskscore_reduce_script`, async () => {
    expect((api.createStoredScript as jest.Mock).mock.calls[3][0].options).toMatchSnapshot();
  });

  it(`Create IngestPipeline: ml_${RiskScoreEntity.host}riskscore_ingest_pipeline`, async () => {
    expect((api.createIngestPipeline as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create Index: ml_${RiskScoreEntity.host}_risk_score_${mockSpaceId}`, async () => {
    expect((api.createIndices as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create Index: ml_${RiskScoreEntity.host}_risk_score_latest_${mockSpaceId}`, async () => {
    expect((api.createIndices as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it(`Create Transform: ml_${RiskScoreEntity.host}riskscore_pivot_transform_${mockSpaceId}`, async () => {
    expect((api.createTransform as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create Transform: ml_${RiskScoreEntity.host}riskscore_latest_transform_${mockSpaceId}`, async () => {
    expect((api.createTransform as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it(`Start Transforms`, () => {
    expect((api.startTransforms as jest.Mock).mock.calls[0][0].transformIds).toMatchSnapshot();
  });

  it(`Create Hosts dashboards`, () => {
    expect(
      (bulkCreatePrebuiltSavedObjects as jest.Mock).mock.calls[0][0].options.templateName
    ).toEqual(`${RiskScoreEntity.host}RiskScoreDashboards`);
  });
});

describe(`installUserRiskScoreModule`, () => {
  beforeAll(async () => {
    await installUserRiskScoreModule({
      http: mockHttp,
      spaceId: `customSpace`,
      timerange: mockTimerange,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it(`Create script: ml_${RiskScoreEntity.user}riskscore_levels_script`, async () => {
    expect((api.createStoredScript as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create script: ml_${RiskScoreEntity.user}riskscore_map_script`, async () => {
    expect((api.createStoredScript as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it(`Create script: ml_${RiskScoreEntity.user}riskscore_reduce_script`, async () => {
    expect((api.createStoredScript as jest.Mock).mock.calls[2][0].options).toMatchSnapshot();
  });

  it(`Create IngestPipeline: ml_${RiskScoreEntity.user}riskscore_ingest_pipeline`, async () => {
    expect((api.createIngestPipeline as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create Index: ml_${RiskScoreEntity.user}_risk_score_${mockSpaceId}`, async () => {
    expect((api.createIndices as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create Index: ml_${RiskScoreEntity.user}_risk_score_latest_${mockSpaceId}`, async () => {
    expect((api.createIndices as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it(`Create Transform: ml_${RiskScoreEntity.user}riskscore_pivot_transform_${mockSpaceId}`, async () => {
    expect((api.createTransform as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create Transform: ml_${RiskScoreEntity.user}riskscore_latest_transform_${mockSpaceId}`, async () => {
    expect((api.createTransform as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it(`Start Transforms`, () => {
    expect((api.startTransforms as jest.Mock).mock.calls[0][0].transformIds).toMatchSnapshot();
  });

  it(`Create Users dashboards`, () => {
    expect(
      (bulkCreatePrebuiltSavedObjects as jest.Mock).mock.calls[0][0].options.templateName
    ).toEqual(`${RiskScoreEntity.user}RiskScoreDashboards`);
  });
});

describe('UninstallRiskScoreModule - Host', () => {
  beforeAll(async () => {
    await uninstallRiskScoreModule({
      http: mockHttp,
      spaceId: 'customSpace',
      riskScoreEntity: RiskScoreEntity.host,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('Delete Hosts dashboards', () => {
    expect(
      (bulkDeletePrebuiltSavedObjects as jest.Mock).mock.calls[0][0].options.templateName
    ).toEqual(`${RiskScoreEntity.host}RiskScoreDashboards`);
  });

  it('Delete Transforms', () => {
    expect((api.deleteTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
      getRiskScorePivotTransformId(RiskScoreEntity.host, mockSpaceId),
      getRiskScoreLatestTransformId(RiskScoreEntity.host, mockSpaceId),
    ]);
  });

  it('Delete ingest pipelines', () => {
    expect((api.deleteIngestPipelines as jest.Mock).mock.calls[0][0].names).toEqual(
      getIngestPipelineName(RiskScoreEntity.host)
    );
  });

  it('Delete stored scripts', () => {
    expect((api.deleteStoredScripts as jest.Mock).mock.calls[0][0].ids).toMatchInlineSnapshot(`
      Array [
        "ml_hostriskscore_levels_script",
        "ml_hostriskscore_init_script",
        "ml_hostriskscore_map_script",
        "ml_hostriskscore_reduce_script",
      ]
    `);
  });
});

describe('uninstallRiskScoreModule - User', () => {
  beforeAll(async () => {
    await uninstallRiskScoreModule({
      http: mockHttp,
      spaceId: 'customSpace',
      riskScoreEntity: RiskScoreEntity.user,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('Delete Users dashboards', () => {
    expect(
      (bulkDeletePrebuiltSavedObjects as jest.Mock).mock.calls[0][0].options.templateName
    ).toEqual(`${RiskScoreEntity.user}RiskScoreDashboards`);
  });

  it('Delete Transforms', () => {
    expect((api.deleteTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
      getRiskScorePivotTransformId(RiskScoreEntity.user, mockSpaceId),
      getRiskScoreLatestTransformId(RiskScoreEntity.user, mockSpaceId),
    ]);
  });

  it('Delete ingest pipelines', () => {
    expect((api.deleteIngestPipelines as jest.Mock).mock.calls[0][0].names).toEqual(
      getIngestPipelineName(RiskScoreEntity.user)
    );
  });

  it('Delete stored scripts', () => {
    expect((api.deleteStoredScripts as jest.Mock).mock.calls[0][0].ids).toMatchInlineSnapshot(`
      Array [
        "ml_userriskscore_levels_script",
        "ml_userriskscore_map_script",
        "ml_userriskscore_reduce_script",
      ]
    `);
  });
});

describe('Restart Transforms - Host', () => {
  beforeAll(async () => {
    await restartRiskScoreTransforms({
      http: mockHttp,
      spaceId: 'customSpace',
      riskScoreEntity: RiskScoreEntity.host,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('Restart Transforms with correct Ids', () => {
    expect((api.stopTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
      getRiskScorePivotTransformId(RiskScoreEntity.host, mockSpaceId),
      getRiskScoreLatestTransformId(RiskScoreEntity.host, mockSpaceId),
    ]);

    expect((api.startTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
      getRiskScorePivotTransformId(RiskScoreEntity.host, mockSpaceId),
      getRiskScoreLatestTransformId(RiskScoreEntity.host, mockSpaceId),
    ]);
  });
});

describe('Restart Transforms - User', () => {
  beforeAll(async () => {
    await restartRiskScoreTransforms({
      http: mockHttp,
      spaceId: 'customSpace',
      riskScoreEntity: RiskScoreEntity.user,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('Restart Transforms with correct Ids', () => {
    expect((api.stopTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
      getRiskScorePivotTransformId(RiskScoreEntity.user, mockSpaceId),
      getRiskScoreLatestTransformId(RiskScoreEntity.user, mockSpaceId),
    ]);

    expect((api.startTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
      getRiskScorePivotTransformId(RiskScoreEntity.user, mockSpaceId),
      getRiskScoreLatestTransformId(RiskScoreEntity.user, mockSpaceId),
    ]);
  });
});
