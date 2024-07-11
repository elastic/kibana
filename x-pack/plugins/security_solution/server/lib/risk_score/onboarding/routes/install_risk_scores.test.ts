/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { INTERNAL_RISK_SCORE_URL } from '../../../../../common/constants';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { installRiskScoresRoute } from './install_risk_scores';
import { createIngestPipeline } from '../helpers/ingest_pipeline';
import { createStoredScript } from '../../stored_scripts/lib/create_script';
import { createIndex } from '../../indices/lib/create_index';
import { createAndStartTransform } from '../../transform/helpers/transforms';

jest.mock('../../stored_scripts/lib/create_script', () => ({
  createStoredScript: jest
    .fn()
    .mockImplementation(({ options }) =>
      Promise.resolve({ [options.id]: { success: true, error: null } })
    ),
}));

jest.mock('../helpers/ingest_pipeline', () => ({
  createIngestPipeline: jest
    .fn()
    .mockImplementation(({ options }) =>
      Promise.resolve({ [options.name]: { success: true, error: null } })
    ),
}));

jest.mock('../../indices/lib/create_index', () => ({
  createIndex: jest
    .fn()
    .mockImplementation(({ options }) =>
      Promise.resolve({ [options.index]: { success: true, error: null } })
    ),
}));

jest.mock('../../transform/helpers/transforms', () => ({
  createAndStartTransform: jest
    .fn()
    .mockImplementation(({ transformId }) =>
      Promise.resolve({ [transformId]: { success: true, error: null } })
    ),
}));

describe(`installRiskScoresRoute - ${RiskScoreEntity.host}`, () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  const logger = { error: jest.fn() } as unknown as Logger;
  const mockSpaceId = 'mockSpaceId';

  beforeAll(async () => {
    jest.clearAllMocks();

    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    const request = requestMock.create({
      method: 'post',
      path: INTERNAL_RISK_SCORE_URL,
      body: {
        riskScoreEntity: RiskScoreEntity.host,
      },
    });

    installRiskScoresRoute(server.router, logger);
    await server.inject(request, requestContextMock.convertContext(context));
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it(`Create script: ml_${RiskScoreEntity.host}riskscore_levels_script_${mockSpaceId}`, async () => {
    expect((createStoredScript as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create IngestPipeline: ml_${RiskScoreEntity.host}riskscore_ingest_pipeline_${mockSpaceId}`, async () => {
    expect((createIngestPipeline as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create script: ml_${RiskScoreEntity.host}riskscore_init_script_${mockSpaceId}`, async () => {
    expect((createStoredScript as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it(`Create script: ml_${RiskScoreEntity.host}riskscore_map_script_${mockSpaceId}`, async () => {
    expect((createStoredScript as jest.Mock).mock.calls[2][0].options).toMatchSnapshot();
  });

  it(`Create script: ml_${RiskScoreEntity.host}riskscore_reduce_script_${mockSpaceId}`, async () => {
    expect((createStoredScript as jest.Mock).mock.calls[3][0].options).toMatchSnapshot();
  });

  it(`Create Index: ml_${RiskScoreEntity.host}_risk_score_${mockSpaceId}`, async () => {
    expect((createIndex as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create Index: ml_${RiskScoreEntity.host}_risk_score_latest_${mockSpaceId}`, async () => {
    expect((createIndex as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it(`Create and start Transform: ml_${RiskScoreEntity.host}riskscore_pivot_transform_${mockSpaceId}`, async () => {
    expect((createAndStartTransform as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create and start Transform: ml_${RiskScoreEntity.host}riskscore_latest_transform_${mockSpaceId}`, async () => {
    expect((createAndStartTransform as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });
});

describe(`installRiskScoresRoute - ${RiskScoreEntity.user}`, () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  const logger = { error: jest.fn() } as unknown as Logger;
  const mockSpaceId = 'mockSpaceId';

  beforeAll(async () => {
    jest.clearAllMocks();

    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    const request = requestMock.create({
      method: 'post',
      path: INTERNAL_RISK_SCORE_URL,
      body: {
        riskScoreEntity: RiskScoreEntity.user,
      },
    });

    installRiskScoresRoute(server.router, logger);
    await server.inject(request, requestContextMock.convertContext(context));
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it(`Create script: ml_${RiskScoreEntity.user}riskscore_levels_script_${mockSpaceId}`, async () => {
    expect((createStoredScript as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create IngestPipeline: ml_${RiskScoreEntity.user}riskscore_ingest_pipeline_${mockSpaceId}`, async () => {
    expect((createIngestPipeline as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create script: ml_${RiskScoreEntity.user}riskscore_map_script_${mockSpaceId}`, async () => {
    expect((createStoredScript as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it(`Create script: ml_${RiskScoreEntity.user}riskscore_reduce_script_${mockSpaceId}`, async () => {
    expect((createStoredScript as jest.Mock).mock.calls[2][0].options).toMatchSnapshot();
  });

  it(`Create Index: ml_${RiskScoreEntity.user}_risk_score_${mockSpaceId}`, async () => {
    expect((createIndex as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create Index: ml_${RiskScoreEntity.user}_risk_score_latest_${mockSpaceId}`, async () => {
    expect((createIndex as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });

  it(`Create Transform: ml_${RiskScoreEntity.user}riskscore_pivot_transform_${mockSpaceId}`, async () => {
    expect((createAndStartTransform as jest.Mock).mock.calls[0][0].options).toMatchSnapshot();
  });

  it(`Create Transform: ml_${RiskScoreEntity.user}riskscore_latest_transform_${mockSpaceId}`, async () => {
    expect((createAndStartTransform as jest.Mock).mock.calls[1][0].options).toMatchSnapshot();
  });
});
