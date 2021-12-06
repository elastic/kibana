/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';

import { has } from 'lodash/fp';
import { createReduceStream } from '@kbn/utils';
import {
  ImportExceptionListItemSchema,
  ImportExceptionsListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

/**
 * Sorts the exceptions into the lists and items.
 * We do this because we don't want the order of the exceptions
 * in the import to matter. If we didn't sort, then some items
 * might error if the list has not yet been created
 * @returns {stream} incoming exceptions sorted into lists and items
 */
export const sortExceptionsStream = (): Transform => {
  return createReduceStream<{
    items: Array<ImportExceptionListItemSchema | Error>;
    lists: Array<ImportExceptionsListSchema | Error>;
  }>(
    (acc, exception) => {
      if (has('entries', exception) || has('item_id', exception)) {
        return { ...acc, items: [...acc.items, exception] };
      } else {
        return { ...acc, lists: [...acc.lists, exception] };
      }
    },
    {
      items: [],
      lists: [],
    }
  );
};

/**
 * Sorts the exceptions into the lists and items.
 * We do this because we don't want the order of the exceptions
 * in the import to matter. If we didn't sort, then some items
 * might error if the list has not yet been created
 * @param exceptions {array} - exceptions to import
 * @returns {stream} incoming exceptions sorted into lists and items
 */
export const sortExceptions = (
  exceptions: ExceptionsImport
): {
  items: ImportExceptionListItemSchema[];
  lists: ImportExceptionsListSchema[];
} => {
  return exceptions.reduce<Array<ImportExceptionListItemSchema | ImportExceptionsListSchema>>(
    (acc, exception) => {
      if (has('entries', exception) || has('item_id', exception)) {
        return { ...acc, items: [...acc.items, exception] };
      } else {
        return { ...acc, lists: [...acc.lists, exception] };
      }
    },
    {
      items: [],
      lists: [],
    }
  );
};
