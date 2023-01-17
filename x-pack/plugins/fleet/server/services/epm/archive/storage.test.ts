/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-common';

import { getAsset } from './storage';

jest.mock('../../app_context', () => {
  return {
    appContextService: {
      getLogger: jest.fn().mockReturnValue({
        warn: jest.fn(),
      }),
    },
  };
});

describe('getAsset', () => {
  it('should not throw error if saved object not found', async () => {
    const soClientMock = {
      get: jest.fn().mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError()),
    } as any;
    const result = await getAsset({
      savedObjectsClient: soClientMock,
      path: 'path',
    });
    expect(result).toBeUndefined();
  });
});
