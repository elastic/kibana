/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSLO } from './fixtures/slo';
import { ManageSLO } from './manage_slo';
import { createSLORepositoryMock, createTransformManagerMock } from './mocks';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

describe('ManageSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let manageSLO: ManageSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    manageSLO = new ManageSLO(mockRepository, mockTransformManager);
  });

  describe('Enable', () => {
    it('does nothing when slo is already enabled', async () => {
      const slo = createSLO({ enabled: true });
      mockRepository.findById.mockResolvedValue(slo);

      await manageSLO.enable(slo.id);

      expect(mockTransformManager.start).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('enables the slo when disabled', async () => {
      const slo = createSLO({ enabled: false });
      mockRepository.findById.mockResolvedValue(slo);

      await manageSLO.enable(slo.id);

      expect(mockTransformManager.start).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    });
  });

  describe('Disable', () => {
    it('does nothing when slo is already disabled', async () => {
      const slo = createSLO({ enabled: false });
      mockRepository.findById.mockResolvedValue(slo);

      await manageSLO.disable(slo.id);

      expect(mockTransformManager.stop).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('disables the slo when enabled', async () => {
      const slo = createSLO({ enabled: true });
      mockRepository.findById.mockResolvedValue(slo);

      await manageSLO.disable(slo.id);

      expect(mockTransformManager.stop).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });
  });
});
