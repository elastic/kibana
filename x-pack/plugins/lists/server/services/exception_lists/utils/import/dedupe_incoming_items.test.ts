/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImportExceptionsListItemSchemaDecodedMock } from '../../../../../common/schemas/request/import_exceptions_schema.mock';

import { getTupleErrorsAndUniqueExceptionListItems } from './dedupe_incoming_items';

describe('getTupleErrorsAndUniqueExceptionListItems', () => {
  it('reports duplicate item_ids', () => {
    const results = getTupleErrorsAndUniqueExceptionListItems([
      getImportExceptionsListItemSchemaDecodedMock(),
      getImportExceptionsListItemSchemaDecodedMock(),
    ]);
    expect(results).toEqual([
      [
        {
          error: {
            message:
              'More than one exception list item with item_id: "item_id_1" found in imports. The last item will be used.',
            status_code: 400,
          },
          item_id: 'item_id_1',
        },
      ],
      [getImportExceptionsListItemSchemaDecodedMock()],
    ]);
  });

  it('does not report duplicates if non exist', () => {
    const results = getTupleErrorsAndUniqueExceptionListItems([
      getImportExceptionsListItemSchemaDecodedMock('1'),
      getImportExceptionsListItemSchemaDecodedMock('2'),
    ]);
    expect(results).toEqual([
      [],
      [
        getImportExceptionsListItemSchemaDecodedMock('1'),
        getImportExceptionsListItemSchemaDecodedMock('2'),
      ],
    ]);
  });
});
