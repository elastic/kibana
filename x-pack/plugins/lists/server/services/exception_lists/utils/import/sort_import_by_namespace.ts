/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ImportExceptionListItemSchemaDecoded,
  ImportExceptionListSchemaDecoded,
} from '@kbn/securitysolution-io-ts-list-types';

/**
 * Helper to sort exception lists by namespace type
 * @param exceptions {array} exception lists to sort
 * @returns {array} tuple of agnostic and non agnostic lists
 */
export const sortListsImportsByNamespace = (
  exceptions: ImportExceptionListSchemaDecoded[]
): [ImportExceptionListSchemaDecoded[], ImportExceptionListSchemaDecoded[]] => {
  return exceptions.reduce<
    [ImportExceptionListSchemaDecoded[], ImportExceptionListSchemaDecoded[]]
  >(
    ([agnostic, single], uniqueList) => {
      if (uniqueList.namespace_type === 'agnostic') {
        return [[...agnostic, uniqueList], single];
      } else {
        return [agnostic, [...single, uniqueList]];
      }
    },
    [[], []]
  );
};

/**
 * Helper to sort exception list items by namespace type
 * @param exceptions {array} exception list items to sort
 * @returns {array} tuple of agnostic and non agnostic items
 */
export const sortItemsImportsByNamespace = (
  exceptions: ImportExceptionListItemSchemaDecoded[]
): [ImportExceptionListItemSchemaDecoded[], ImportExceptionListItemSchemaDecoded[]] => {
  return exceptions.reduce<
    [ImportExceptionListItemSchemaDecoded[], ImportExceptionListItemSchemaDecoded[]]
  >(
    ([agnostic, single], uniqueList) => {
      if (uniqueList.namespace_type === 'agnostic') {
        return [[...agnostic, uniqueList], single];
      } else {
        return [agnostic, [...single, uniqueList]];
      }
    },
    [[], []]
  );
};
