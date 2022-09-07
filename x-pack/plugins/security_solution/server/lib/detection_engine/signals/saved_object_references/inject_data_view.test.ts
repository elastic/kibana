/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SavedObjectReference } from '@kbn/core/server';
import { injectDataViewReferences } from './inject_data_view';

describe('inject_data_view', () => {
  type FuncReturn = ReturnType<typeof injectDataViewReferences>;
  let logger = loggingSystemMock.create().get('security_solution');
  const mockSavedObjectReferences = (): SavedObjectReference[] => [
    {
      id: 'logs-*',
      name: 'dataViewId_0',
      type: 'index-pattern',
    },
  ];

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  test('returns undefined given an empty "dataViewId" and "savedObjectReferences"', () => {
    expect(
      injectDataViewReferences({
        logger,
        savedObjectReferences: [],
      })
    ).toBeUndefined();
  });

  test('returns undefined given undefined for "dataViewId"', () => {
    expect(
      injectDataViewReferences({
        logger,
        savedObjectReferences: [],
      })
    ).toBeUndefined();
  });

  test('returns undefined given null for "dataViewId"', () => {
    expect(
      injectDataViewReferences({
        logger,
        savedObjectReferences: [],
      })
    ).toBeUndefined();
  });

  test('returns undefined when given an empty array for "savedObjectReferences"', () => {
    expect(
      injectDataViewReferences({
        logger,
        savedObjectReferences: [],
      })
    ).toEqual<FuncReturn>(undefined);
  });

  test('returns parameters from the saved object if found', () => {
    expect(
      injectDataViewReferences({
        logger,
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>('logs-*');
  });
});
