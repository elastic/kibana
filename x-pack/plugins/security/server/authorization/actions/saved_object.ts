/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString } from 'lodash';
import {
  SavedObjectConditionalPrivilege,
  isSavedObjectConditionalPrivilege,
} from '../../../../features/server/feature_kibana_privileges';

export class SavedObjectActions {
  private readonly prefix: string;

  constructor(versionNumber: string) {
    this.prefix = `saved_object:${versionNumber}:`;
  }

  public get all(): string {
    return `${this.prefix}*`;
  }

  public get(
    typeOrSavedObjectConditionalPrivilege: string | SavedObjectConditionalPrivilege,
    operation: string
  ): string {
    if (!typeOrSavedObjectConditionalPrivilege) {
      throw new Error('typeOrSavedObjectPrivilege is required');
    }

    if (!operation || !isString(operation)) {
      throw new Error('operation is required and must be a string');
    }

    if (isString(typeOrSavedObjectConditionalPrivilege)) {
      return `${this.prefix}${typeOrSavedObjectConditionalPrivilege}/${operation}`;
    }

    if (isSavedObjectConditionalPrivilege(typeOrSavedObjectConditionalPrivilege)) {
      const conditions = Array.isArray(typeOrSavedObjectConditionalPrivilege.condition)
        ? typeOrSavedObjectConditionalPrivilege.condition
        : [typeOrSavedObjectConditionalPrivilege.condition];
      return `${this.prefix}${
        typeOrSavedObjectConditionalPrivilege.type
      }/${operation}(${conditions.map(({ key, value }) => `${key}=${value}`).join('&')})`;
    }

    throw new Error(
      `typeOrSavedObjectPrivilege must be a string or SavedObjectConditionalPrivilege`
    );
  }
}
