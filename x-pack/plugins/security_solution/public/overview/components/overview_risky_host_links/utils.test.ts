/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';

import * as api from './api';
import {
  installHostRiskScoreModule,
  installUserRiskScoreModule,
  restartRiskScoreTransforms,
  RiskScoreModuleName,
  uninstallRiskScoreModule,
} from './utils';
jest.mock('./api');

const mockHttp = {
  post: jest.fn(),
} as unknown as HttpSetup;

describe('installHostRiskScoreModule', () => {
  beforeAll(async () => {
    await installHostRiskScoreModule({ http: mockHttp, spaceId: 'customSpace' });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('Create IngestPipeline: ml_hostriskscore_ingest_pipeline', async () => {
    expect((api.createIngestPipeline as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it('Create Index: ml_host_risk_score_{spaceId}', async () => {
    expect((api.createIndices as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it('Create Index: ml_host_risk_score_latest_{spaceId}', async () => {
    expect((api.createIndices as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it('Create Transform: ml_hostriskscore_pivot_transform_{spaceId}', async () => {
    expect((api.createTransform as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it('Create Transform: ml_hostriskscore_latest_transform_{spaceId}', async () => {
    expect((api.createTransform as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it('Start Transforms', () => {
    expect((api.startTransforms as jest.Mock).mock.calls[0][0].transformIds).toMatchSnapshot();
  });
});

describe('installUserRiskScoreModule', () => {
  beforeAll(async () => {
    await installUserRiskScoreModule({ http: mockHttp, spaceId: 'customSpace' });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('Create IngestPipeline: ml_userriskscore_ingest_pipeline', async () => {
    expect((api.createIngestPipeline as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it('Create Index: ml_user_risk_score_{spaceId}', async () => {
    expect((api.createIndices as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it('Create Index: ml_user_risk_score_latest_{spaceId}', async () => {
    expect((api.createIndices as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it('Create Transform: ml_userriskscore_pivot_transform_{spaceId}', async () => {
    expect((api.createTransform as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it('Create Transform: ml_userriskscore_latest_transform_{spaceId}', async () => {
    expect((api.createTransform as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it('Start Transforms', () => {
    expect((api.startTransforms as jest.Mock).mock.calls[0][0].transformIds).toMatchSnapshot();
  });
});

describe('uninstallRiskScoreModule - Host', () => {
  beforeAll(async () => {
    await uninstallRiskScoreModule({
      http: mockHttp,
      spaceId: 'customSpace',
      moduleName: RiskScoreModuleName.Host,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('Delete Transforms', () => {
    expect((api.deleteTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
      `ml_hostriskscore_pivot_transform_customSpace`,
      `ml_hostriskscore_latest_transform_customSpace`,
    ]);
  });

  it('Delete ingest pipelines', () => {
    expect((api.deleteIngestPipelines as jest.Mock).mock.calls[0][0].names).toEqual(
      `ml_hostriskscore_ingest_pipeline`
    );
  });
});

describe('uninstallRiskScoreModule - User', () => {
  beforeAll(async () => {
    await uninstallRiskScoreModule({
      http: mockHttp,
      spaceId: 'customSpace',
      moduleName: RiskScoreModuleName.User,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('Delete Transforms', () => {
    expect((api.deleteTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
      `ml_userriskscore_pivot_transform_customSpace`,
      `ml_userriskscore_latest_transform_customSpace`,
    ]);
  });

  it('Delete ingest pipelines', () => {
    expect((api.deleteIngestPipelines as jest.Mock).mock.calls[0][0].names).toEqual(
      `ml_userriskscore_ingest_pipeline`
    );
  });
});

describe('Restart Transforms - Host', () => {
  beforeAll(async () => {
    await restartRiskScoreTransforms({
      http: mockHttp,
      spaceId: 'customSpace',
      moduleName: RiskScoreModuleName.Host,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('Restart Transforms with correct Ids', () => {
    expect((api.restartTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
      `ml_hostriskscore_pivot_transform_customSpace`,
      `ml_hostriskscore_latest_transform_customSpace`,
    ]);
  });
});

describe('Restart Transforms - User', () => {
  beforeAll(async () => {
    await restartRiskScoreTransforms({
      http: mockHttp,
      spaceId: 'customSpace',
      moduleName: RiskScoreModuleName.User,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('Restart Transforms with correct Ids', () => {
    expect((api.restartTransforms as jest.Mock).mock.calls[0][0].transformIds).toEqual([
      `ml_userriskscore_pivot_transform_customSpace`,
      `ml_userriskscore_latest_transform_customSpace`,
    ]);
  });
});
