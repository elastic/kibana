/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { BaseValidator } from './base_validator';

export class EndpointExceptionsValidator extends BaseValidator {
  static isEndpointException(item: { listId: string }): boolean {
    return item.listId === ENDPOINT_LIST_ID;
  }

  protected async validateHasReadPrivilege(): Promise<void> {
    return this.validateHasEndpointExceptionsPrivileges('canReadEndpointExceptions');
  }

  protected async validateHasWritePrivilege(): Promise<void> {
    return this.validateHasEndpointExceptionsPrivileges('canWriteEndpointExceptions');
  }

  async validatePreCreateItem(item: CreateExceptionListItemOptions) {
    await this.validateHasWritePrivilege();
    return item;
  }

  async validatePreUpdateItem(item: UpdateExceptionListItemOptions) {
    await this.validateHasWritePrivilege();
    return item;
  }

  async validatePreDeleteItem(): Promise<void> {
    await this.validateHasWritePrivilege();
  }

  async validatePreGetOneItem(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreMultiListFind(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreExport(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreSingleListFind(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreGetListSummary(): Promise<void> {
    await this.validateHasReadPrivilege();
  }
}
