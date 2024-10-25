/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO_MODEL_VERSION } from '../../common/constants';
import { createSLO } from './fixtures/slo';
import {
  createSloContextMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
  SLOContextMock,
} from './mocks';
import { ResetSLO } from './reset_slo';
import { TransformManager } from './transform_manager';

const TEST_DATE = new Date('2023-01-01T00:00:00.000Z');

describe('ResetSLO', () => {
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let resetSLO: ResetSLO;
  let contextMock: jest.Mocked<SLOContextMock>;

  beforeEach(() => {
    contextMock = createSloContextMock();
    mockTransformManager = createTransformManagerMock();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    resetSLO = new ResetSLO(contextMock, mockTransformManager, mockSummaryTransformManager);
    jest.useFakeTimers().setSystemTime(TEST_DATE);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('resets all associated resources', async () => {
    const slo = createSLO({ id: 'irrelevant', version: 1 });
    contextMock.repository.findById.mockResolvedValueOnce(slo);
    contextMock.repository.update.mockImplementation((v) => Promise.resolve(v));

    await resetSLO.execute(slo.id);

    // delete existing resources and data
    expect(mockSummaryTransformManager.stop).toMatchSnapshot();
    expect(mockSummaryTransformManager.uninstall).toMatchSnapshot();

    expect(mockTransformManager.stop).toMatchSnapshot();
    expect(mockTransformManager.uninstall).toMatchSnapshot();

    expect(contextMock.esClient.deleteByQuery).toMatchSnapshot();

    // install resources
    expect(mockSummaryTransformManager.install).toMatchSnapshot();
    expect(mockSummaryTransformManager.start).toMatchSnapshot();

    expect(
      contextMock.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline
    ).toMatchSnapshot();

    expect(mockTransformManager.install).toMatchSnapshot();
    expect(mockTransformManager.start).toMatchSnapshot();

    expect(contextMock.esClient.index).toMatchSnapshot();

    expect(contextMock.repository.update).toHaveBeenCalledWith({
      ...slo,
      version: SLO_MODEL_VERSION,
      updatedAt: expect.anything(),
    });
  });
});
