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
  createTransformInstallerMock,
} from './mocks';
import { ResourceInstaller } from './resource_installer';
import { SLORepository } from './slo_repository';
import { TransformInstaller } from './transform_installer';

const SPACE_ID = 'some-space-id';

describe('createSLO', () => {
  let mockResourceInstaller: jest.Mocked<ResourceInstaller>;
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformInstaller: jest.Mocked<TransformInstaller>;
  let createSLO: CreateSLO;

  beforeEach(() => {
    mockResourceInstaller = createResourceInstallerMock();
    mockRepository = createSLORepositoryMock();
    mockTransformInstaller = createTransformInstallerMock();
    createSLO = new CreateSLO(
      mockResourceInstaller,
      mockRepository,
      mockTransformInstaller,
      SPACE_ID
    );
  });

  describe('happy path', () => {
    it('calls the expected services', async () => {
      const sloParams = createSLOParams(createAPMTransactionErrorRateIndicator());
      const response = await createSLO.execute(sloParams);

      expect(mockResourceInstaller.ensureCommonResourcesInstalled).toHaveBeenCalledWith(SPACE_ID);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ ...sloParams, id: expect.any(String) })
      );
      expect(mockTransformInstaller.installAndStartTransform).toHaveBeenCalledWith(
        expect.objectContaining({ ...sloParams, id: expect.any(String) }),
        SPACE_ID
      );
      expect(response).toEqual(expect.objectContaining({ id: expect.any(String) }));
    });
  });

  describe('unhappy path', () => {
    it('deletes the SLO saved objects when transform installation fails', async () => {
      mockTransformInstaller.installAndStartTransform.mockRejectedValue(
        new Error('Transform Error')
      );
      const sloParams = createSLOParams(createAPMTransactionErrorRateIndicator());

      await expect(createSLO.execute(sloParams)).rejects.toThrowError('Transform Error');
      expect(mockRepository.deleteById).toBeCalled();
    });
  });
});
