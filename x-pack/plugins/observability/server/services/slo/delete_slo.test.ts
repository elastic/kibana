/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOTransformId } from '../../assets/constants';
import { DeleteSLO } from './delete_slo';
import { createSLORepositoryMock, createTransformManagerMock } from './mocks';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

describe('DeleteSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let deleteSLO: DeleteSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    deleteSLO = new DeleteSLO(mockRepository, mockTransformManager);
  });

  describe('happy path', () => {
    it('calls the expected services', async () => {
      const sloId = 'some-slo-id';
      const response = await deleteSLO.execute(sloId);

      expect(mockRepository.deleteById).toHaveBeenCalledWith(sloId);
      expect(mockTransformManager.stop).toHaveBeenCalledWith(getSLOTransformId(sloId));
      expect(mockTransformManager.uninstall).toHaveBeenCalledWith(getSLOTransformId(sloId));
      expect(response).toBe(true);
    });
  });
});
