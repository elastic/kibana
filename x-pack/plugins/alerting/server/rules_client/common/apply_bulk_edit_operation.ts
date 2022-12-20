/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { set, get, isEqual } from 'lodash';
import type { BulkEditOperation, BulkEditFields } from '../types';

// defining an union type that will passed directly to generic function as a workaround for the issue similar to
// https://github.com/microsoft/TypeScript/issues/29479
type AddItemToArray =
  | Extract<BulkEditOperation, { field: Extract<BulkEditFields, 'tags'> }>['value'][number]
  | Extract<BulkEditOperation, { field: Extract<BulkEditFields, 'actions'> }>['value'][number];

/**
 * this method takes BulkEdit operation and applies it to rule, by mutating it
 * @param operation BulkEditOperation
 * @param rule object rule to update
 * @returns modified rule
 */
export const applyBulkEditOperation = <R extends object>(operation: BulkEditOperation, rule: R) => {
  const addItemsToArray = <T>(arr: T[], items: T[]): T[] => Array.from(new Set([...arr, ...items]));

  const deleteItemsFromArray = <T>(arr: T[], items: T[]): T[] => {
    const itemsSet = new Set(items);
    return arr.filter((item) => !itemsSet.has(item));
  };

  const originalFieldValue = get(rule, operation.field);

  switch (operation.operation) {
    case 'set':
      set(rule, operation.field, operation.value);
      break;

    case 'add':
      set(
        rule,
        operation.field,
        addItemsToArray<AddItemToArray>(get(rule, operation.field) ?? [], operation.value)
      );
      break;

    case 'delete':
      set(
        rule,
        operation.field,
        deleteItemsFromArray(get(rule, operation.field) ?? [], operation.value || [])
      );
      break;
  }

  return {
    modifiedAttributes: rule,
    isAttributeModified: !isEqual(originalFieldValue, get(rule, operation.field)),
  };
};
