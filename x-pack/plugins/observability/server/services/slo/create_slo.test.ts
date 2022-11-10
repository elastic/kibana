/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSLO } from './create_slo';
import { createAPMTransactionErrorRateIndicator, createSLOParams } from './fixtures/slo';
import {
  createResourceInstallerMock,
  createSLORepositoryMock,
  createTransformManagerMock,
} from './mocks';
import { ResourceInstaller } from './resource_installer';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

describe('CreateSLO', () => {
  let mockResourceInstaller: jest.Mocked<ResourceInstaller>;
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let createSLO: CreateSLO;

  beforeEach(() => {
    mockResourceInstaller = createResourceInstallerMock();
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    createSLO = new CreateSLO(mockResourceInstaller, mockRepository, mockTransformManager);
  });

  describe('happy path', () => {
    it('calls the expected services', async () => {
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });
      mockTransformManager.install.mockResolvedValue('slo-transform-id');

      const response = await createSLO.execute(sloParams);

      expect(mockResourceInstaller.ensureCommonResourcesInstalled).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ ...sloParams, id: expect.any(String) })
      );
      expect(mockTransformManager.install).toHaveBeenCalledWith(
        expect.objectContaining({ ...sloParams, id: expect.any(String) })
      );
      expect(mockTransformManager.start).toHaveBeenCalledWith('slo-transform-id');
      expect(response).toEqual(expect.objectContaining({ id: expect.any(String) }));
    });
  });

  describe('unhappy path', () => {
    it('deletes the SLO when transform installation fails', async () => {
      mockTransformManager.install.mockRejectedValue(new Error('Transform install error'));
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError('Transform install error');
      expect(mockRepository.deleteById).toBeCalled();
    });

    it('removes the transform and deletes the SLO when transform start fails', async () => {
      mockTransformManager.install.mockResolvedValue('slo-transform-id');
      mockTransformManager.start.mockRejectedValue(new Error('Transform start error'));
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError('Transform start error');
      expect(mockTransformManager.uninstall).toBeCalledWith('slo-transform-id');
      expect(mockRepository.deleteById).toBeCalled();
    });
  });
});
