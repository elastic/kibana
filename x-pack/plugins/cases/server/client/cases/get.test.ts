/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMockArgs } from '../mocks';
import { getCasesByAlertID, getTags, getReporters, getCategories } from './get';

describe('get', () => {
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCasesByAlertID', () => {
    it('throws with excess fields', async () => {
      await expect(
        getCasesByAlertID(
          // @ts-expect-error: excess attribute
          { options: { owner: 'cases', foo: 'bar' }, alertID: 'test-alert' },
          clientArgs
        )
      ).rejects.toThrow('invalid keys "foo"');
    });
  });

  describe('getTags', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getTags({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'invalid keys "foo"'
      );
    });
  });

  describe('getReporters', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getReporters({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'invalid keys "foo"'
      );
    });
  });

  describe('getCategories', () => {
    it('throws with excess fields', async () => {
      // @ts-expect-error: excess attribute
      await expect(getCategories({ owner: 'cases', foo: 'bar' }, clientArgs)).rejects.toThrow(
        'invalid keys "foo"'
      );
    });
  });
});
