/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { isCompatible } from './is_compatible';
import { canUseCases } from '../../../client/helpers/can_use_cases';
import { getMockLensApi } from './mocks';

jest.mock('../../../../common/utils/owner', () => ({
  getCaseOwnerByAppId: () => 'securitySolution',
}));

jest.mock('../../../client/helpers/can_use_cases', () => {
  const actual = jest.requireActual('../../../client/helpers/can_use_cases');
  return {
    ...actual,
    canUseCases: jest.fn(),
  };
});

describe('isCompatible', () => {
  const appId = 'myAppId';
  const mockCoreStart = coreMock.createStart();

  const mockCasePermissions = jest.fn();
  beforeEach(() => {
    (canUseCases as jest.Mock).mockReturnValue(
      mockCasePermissions.mockReturnValue({ create: true, update: true })
    );
    jest.clearAllMocks();
  });

  test('should return false if error embeddable', async () => {
    const errorApi = {
      ...getMockLensApi(),
      blockingError: new BehaviorSubject<Error | undefined>(new Error('Simulated blocking error')),
    };
    expect(isCompatible(errorApi, appId, mockCoreStart)).toBe(false);
  });

  test('should return false if not lens embeddable', async () => {
    expect(isCompatible({}, appId, mockCoreStart)).toBe(false);
  });

  test('should return false if no permission', async () => {
    mockCasePermissions.mockReturnValue({ create: false, update: false });
    expect(isCompatible(getMockLensApi(), appId, mockCoreStart)).toBe(false);
  });

  test('should return true if is lens embeddable', async () => {
    expect(isCompatible(getMockLensApi(), appId, mockCoreStart)).toBe(true);
  });
});
