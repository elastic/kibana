/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { addObservable, updateObservable } from './observables';
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

const mockObservable = {
  value: '127.0.0.1',
  typeKey: OBSERVABLE_TYPE_IPV4.key,
  id: '5c431380-c6ef-459f-b0fe-1699e978517b',
  description: null,
  createdAt: '2024-12-05',
  updatedAt: '2024-12-05',
};
const caseSOWithObservables = {
  ...caseSO,
  attributes: {
    ...caseSO.attributes,
    observables: [mockObservable],
  },
};
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

  it('should throw an error if duplicate observable is posted', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);

    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);

    await expect(
      addObservable(
        'case-id',
        { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1', description: '' } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.badRequest(
        'Failed to add observable: {"observable":{"typeKey":"observable-type-ipv4","value":"127.0.0.1","description":""}}: Error: Invalid duplicated observables in request.'
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

describe('updateObservable', () => {
  beforeEach(() => {
    mockCaseService.patchCase.mockResolvedValue(caseSOWithObservables);
    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);
    jest.clearAllMocks();
  });

  it('should update an observable successfully', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    const result = await updateObservable(
      'case-id',
      mockObservable.id,
      {
        observable: {
          value: '192.168.0.1',
          description: 'Updated description',
        },
      },
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
      updateObservable(
        'case-id',
        'observable-id',
        {
          observable: {
            value: '192.168.0.1',
            description: 'Updated description',
          },
        },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.forbidden(
        'In order to update observables in cases, you must be subscribed to an Elastic Platinum license'
      )
    );
  });

  it('should handle errors and throw boom', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockCaseService.getCase.mockRejectedValue(new Error('Case not found'));

    await expect(
      updateObservable(
        'case-id',
        'observable-id',
        { observable: { value: 'test', description: 'Updated description' } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow();
  });
});
