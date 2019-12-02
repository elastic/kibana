/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString } from 'lodash';
import {
  SavedObjectPrivilege,
  isSavedObjectPrivilege,
} from '../../../../features/server/feature_kibana_privileges';

export class SavedObjectActions {
  private readonly prefix: string;

  constructor(versionNumber: string) {
    this.prefix = `saved_object:${versionNumber}:`;
  }

  public get all(): string {
    return `${this.prefix}*`;
  }

  public get(typeOrSavedObjectPrivilege: string | SavedObjectPrivilege, operation: string): string {
    if (!typeOrSavedObjectPrivilege) {
      throw new Error('typeOrSavedObjectPrivilege is required');
    }

    if (!operation || !isString(operation)) {
      throw new Error('operation is required and must be a string');
    }

    if (isString(typeOrSavedObjectPrivilege)) {
      return `${this.prefix}${typeOrSavedObjectPrivilege}/${operation}`;
    }

    if (isSavedObjectPrivilege(typeOrSavedObjectPrivilege)) {
      return `${this.prefix}${typeOrSavedObjectPrivilege.type}/${operation}(${typeOrSavedObjectPrivilege.when.key}=${typeOrSavedObjectPrivilege.when.value})`;
    }

    throw new Error(`typeOrSavedObjectPrivilege must be a string or SavedObjectPrivilege`);
  }
}
