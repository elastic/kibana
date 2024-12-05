/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { addObservable } from './observables';
import Boom from '@hapi/boom';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { mockCases } from '../../mocks';
import { OBSERVABLE_TYPE_IPV4 } from '../../../common/constants';

const caseSO = mockCases[0];

const mockCasesClient = createCasesClientMock();
const mockClientArgs = createCasesClientMockArgs();

const mockLicensingService = mockClientArgs.services.licensingService;
const mockCaseService = mockClientArgs.services.caseService;

describe('addObservable', () => {
  beforeEach(() => {
    mockCaseService.patchCase.mockResolvedValue(caseSO);
    mockCaseService.getCase.mockResolvedValue(caseSO);
    jest.clearAllMocks();
  });

  it('should add an observable successfully', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    const result = await addObservable(
      'case-id',
      { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1', description: '' } },
      mockClientArgs,
      mockCasesClient
    );

    expect(mockLicensingService.notifyUsage).toHaveBeenCalledWith(
      LICENSING_CASE_OBSERVABLES_FEATURE
    );
    expect(result).toBeDefined();
  });

  it('should throw an error if license is not platinum', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(false);

    await expect(
      addObservable(
        'case-id',
        { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1', description: '' } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.forbidden(
        'In order to assign observables to cases, you must be subscribed to an Elastic Platinum license'
      )
    );
  });

  it('should throw an error if observable type is invalid', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);

    await expect(
      addObservable(
        'case-id',
        { observable: { typeKey: 'invalid type', value: '127.0.0.1', description: '' } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.badRequest(
        'Failed to add observable: {"observable":{"typeKey":"invalid type","value":"127.0.0.1","description":""}}: Error: Invalid observable type, key does not exist: invalid type'
      )
    );
  });

  it('should handle errors and throw boom', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockCaseService.getCase.mockRejectedValue(new Error('Case not found'));

    await expect(
      addObservable(
        'case-id',
        { observable: { typeKey: 'typeKey', value: 'test', description: '' } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow();
  });
});
