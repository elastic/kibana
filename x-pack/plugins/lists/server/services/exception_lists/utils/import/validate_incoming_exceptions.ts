/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';

import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { createMapStream } from '@kbn/utils';
import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';
import {
  ImportExceptionListItemSchema,
  ImportExceptionListItemSchemaDecoded,
  ImportExceptionListSchemaDecoded,
  ImportExceptionsListSchema,
  importExceptionListItemSchema,
  importExceptionsListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { BadRequestError } from '@kbn/securitysolution-es-utils';

/**
 * Validates exception lists and items schemas incoming as stream
 * @returns {stream} validated lists and items
 */
export const validateExceptionsStream = (): Transform => {
  return createMapStream<{
    items: Array<ImportExceptionListItemSchema | Error>;
    lists: Array<ImportExceptionsListSchema | Error>;
  }>((exceptions) => ({
    items: validateExceptionsItems(exceptions.items),
    lists: validateExceptionsLists(exceptions.lists),
  }));
};

/**
 * Validates exception lists and items schemas incoming as array
 * @param exceptions {array} - exceptions to import sorted by list/item
 * @returns {object} validated lists and items
 */
export const validateExceptions = (exceptions: {
  items: Array<ImportExceptionListItemSchema | Error>;
  lists: Array<ImportExceptionsListSchema | Error>;
}): {
  items: Array<ImportExceptionListItemSchema | Error>;
  lists: Array<ImportExceptionsListSchema | Error>;
} => {
  return {
    items: validateExceptionsItems(exceptions.items),
    lists: validateExceptionsLists(exceptions.lists),
  };
};

/**
 * Validates exception lists incoming as array
 * @param lists {array} - exception lists to import
 * @returns {array} validated exception lists and validation errors
 */
export const validateExceptionsLists = (
  lists: Array<ImportExceptionsListSchema | Error>
): Array<ImportExceptionListSchemaDecoded | Error> => {
  const onLeft = (errors: t.Errors): BadRequestError | ImportExceptionListSchemaDecoded => {
    return new BadRequestError(formatErrors(errors).join());
  };
  const onRight = (
    schemaList: ImportExceptionsListSchema
  ): BadRequestError | ImportExceptionListSchemaDecoded => {
    return schemaList as ImportExceptionListSchemaDecoded;
  };

  return lists.map((obj: ImportExceptionsListSchema | Error) => {
    if (!(obj instanceof Error)) {
      const decodedList = importExceptionsListSchema.decode(obj);
      const checkedList = exactCheck(obj, decodedList);

      return pipe(checkedList, fold(onLeft, onRight));
    } else {
      return obj;
    }
  });
};

/**
 * Validates exception items incoming as array
 * @param items {array} - exception items to import
 * @returns {array} validated exception items and validation errors
 */
export const validateExceptionsItems = (
  items: Array<ImportExceptionListItemSchema | Error>
): Array<ImportExceptionListItemSchemaDecoded | Error> => {
  const onLeft = (errors: t.Errors): BadRequestError | ImportExceptionListItemSchemaDecoded => {
    return new BadRequestError(formatErrors(errors).join());
  };
  const onRight = (
    itemSchema: ImportExceptionListItemSchema
  ): BadRequestError | ImportExceptionListItemSchemaDecoded => {
    return itemSchema as ImportExceptionListItemSchemaDecoded;
  };

  return items.map((item: ImportExceptionListItemSchema | Error) => {
    if (!(item instanceof Error)) {
      const decodedItem = importExceptionListItemSchema.decode(item);
      const checkedItem = exactCheck(item, decodedItem);

      return pipe(checkedItem, fold(onLeft, onRight));
    } else {
      return item;
    }
  });
};
