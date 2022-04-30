/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImportExceptionsListSchemaDecodedMock } from '../../../../../common/schemas/request/import_exceptions_schema.mock';

import { getTupleErrorsAndUniqueExceptionLists } from './dedupe_incoming_lists';

describe('getTupleErrorsAndUniqueExceptionLists', () => {
  it('reports duplicate list_ids', () => {
    const results = getTupleErrorsAndUniqueExceptionLists([
      getImportExceptionsListSchemaDecodedMock(),
      getImportExceptionsListSchemaDecodedMock(),
    ]);
    expect(results).toEqual([
      [
        {
          error: {
            message:
              'More than one exception list with list_id: "detection_list_id" found in imports. The last list will be used.',
            status_code: 400,
          },
          list_id: 'detection_list_id',
        },
      ],
      [getImportExceptionsListSchemaDecodedMock()],
    ]);
  });

  it('does not report duplicates if non exist', () => {
    const results = getTupleErrorsAndUniqueExceptionLists([
      getImportExceptionsListSchemaDecodedMock('1'),
      getImportExceptionsListSchemaDecodedMock('2'),
    ]);
    expect(results).toEqual([
      [],
      [
        getImportExceptionsListSchemaDecodedMock('1'),
        getImportExceptionsListSchemaDecodedMock('2'),
      ],
    ]);
  });
});
