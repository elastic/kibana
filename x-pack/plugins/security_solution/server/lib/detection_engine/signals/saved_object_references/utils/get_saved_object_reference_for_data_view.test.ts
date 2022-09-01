/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SavedObjectReference } from '@kbn/core/server';
import { getSavedObjectReferenceForDataView } from '.';

describe('get_saved_object_reference_for_data_view', () => {
  type FuncReturn = ReturnType<typeof getSavedObjectReferenceForDataView>;
  let logger = loggingSystemMock.create().get('security_solution');

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  const mockSavedObjectReferences = (): SavedObjectReference[] => [
    {
      id: 'logs-*',
      name: 'dataViewId_0',
      type: 'index-pattern',
    },
  ];

  test('returns reference found, given index zero', () => {
    expect(
      getSavedObjectReferenceForDataView({
        logger,
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>(mockSavedObjectReferences()[0]);
  });

  test('returns undefined, when it cannot find the reference', () => {
    expect(
      getSavedObjectReferenceForDataView({
        logger,
        savedObjectReferences: [{ ...mockSavedObjectReferences()[0], name: 'other-name_0' }],
      })
    ).toEqual<FuncReturn>(undefined);
  });

  test('returns found reference, even if the reference is mixed with other references', () => {
    expect(
      getSavedObjectReferenceForDataView({
        logger,
        savedObjectReferences: [
          { ...mockSavedObjectReferences()[0], name: 'other-name_0' },
          mockSavedObjectReferences()[0],
        ],
      })
    ).toEqual<FuncReturn>(mockSavedObjectReferences()[0]);
  });
});
