/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import {
  BulkErrorSchema,
  ImportExceptionListSchemaDecoded,
} from '@kbn/securitysolution-io-ts-list-types';

/**
 * Reports on duplicates and returns unique array of lists
 * @param lists - exception lists to be checked for duplicate list_ids
 * @returns {Array} tuple of duplicate errors and unique lists
 */
export const getTupleErrorsAndUniqueExceptionLists = (
  lists: Array<ImportExceptionListSchemaDecoded | Error>
): [BulkErrorSchema[], ImportExceptionListSchemaDecoded[]] => {
  const { errors, listsAcc } = lists.reduce(
    (acc, parsedExceptionList) => {
      if (parsedExceptionList instanceof Error) {
        acc.errors.set(uuid.v4(), {
          error: {
            message: `Error found importing exception list: ${parsedExceptionList.message}`,
            status_code: 400,
          },
          list_id: '(unknown list_id)',
        });
      } else {
        const { list_id: listId } = parsedExceptionList;
        if (acc.listsAcc.has(listId)) {
          acc.errors.set(uuid.v4(), {
            error: {
              message: `More than one exception list with list_id: "${listId}" found in imports. The last list will be used.`,
              status_code: 400,
            },
            list_id: listId,
          });
        }
        acc.listsAcc.set(listId, parsedExceptionList);
      }

      return acc;
    }, // using map (preserves ordering)
    {
      errors: new Map<string, BulkErrorSchema>(),
      listsAcc: new Map<string, ImportExceptionListSchemaDecoded>(),
    }
  );

  return [Array.from(errors.values()), Array.from(listsAcc.values())];
};
