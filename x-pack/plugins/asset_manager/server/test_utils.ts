/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Helper function allows test to verify error was thrown,
// verify error is of the right class type, and error has

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { GetApmIndicesMethod } from './lib/asset_client_types';
import { AssetsValidationError } from './lib/validators/validation_error';

// the expected metadata such as statusCode on it
export function expectToThrowValidationErrorWithStatusCode(
  testFn: () => Promise<any>,
  expectedError: Partial<AssetsValidationError> = {}
) {
  return expect(async () => {
    try {
      return await testFn();
    } catch (error: any) {
      if (error instanceof AssetsValidationError) {
        if (expectedError.statusCode) {
          expect(error.statusCode).toEqual(expectedError.statusCode);
        }
        if (expectedError.message) {
          expect(error.message).toEqual(expect.stringContaining(expectedError.message));
        }
      }
      throw error;
    }
  }).rejects.toThrow(AssetsValidationError);
}

export function createGetApmIndicesMock(): jest.Mocked<GetApmIndicesMethod> {
  return jest.fn(async (client: SavedObjectsClientContract) => ({
    transaction: 'apm-mock-transaction-indices',
    span: 'apm-mock-span-indices',
    error: 'apm-mock-error-indices',
    metric: 'apm-mock-metric-indices',
    onboarding: 'apm-mock-onboarding-indices',
    sourcemap: 'apm-mock-sourcemap-indices',
  }));
}
