/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString } from 'lodash';

const coerceToArray = <T>(itemOrItems: T | T[]): T[] => {
  return Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
};

export class SavedObjectActions {
  private static readOperations: string[] = ['bulk_get', 'get', 'find'];
  private static writeOperations: string[] = ['create', 'bulk_create', 'update', 'delete'];
  private static allOperations: string[] = [
    ...SavedObjectActions.readOperations,
    ...SavedObjectActions.writeOperations,
  ];

  public all = `saved_object:*`;

  public get(type: string, operation: string): string {
    if (!type || !isString(type)) {
      throw new Error('type is required and must be a string');
    }

    if (!operation || !isString(operation)) {
      throw new Error('action is required and must be a string');
    }

    return `saved_object:${type}/${operation}`;
  }

  public allOperations(typeOrTypes: string | string[]): string[] {
    const types = coerceToArray(typeOrTypes);
    return this.build(types, SavedObjectActions.allOperations);
  }

  public readOperations(typeOrTypes: string | string[]): string[] {
    const types = coerceToArray(typeOrTypes);
    return this.build(types, SavedObjectActions.readOperations);
  }

  public writeOperations(typeOrTypes: string | string[]): string[] {
    const types = coerceToArray(typeOrTypes);
    return this.build(types, SavedObjectActions.writeOperations);
  }

  private build(types: string[], methods: string[]) {
    return types
      .map(type => methods.map(method => this.get(type, method)))
      .reduce((acc, typeActions) => [...acc, ...typeActions], []);
  }
}
