/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  CreateExceptionListOptions,
  UpdateExceptionListOptions,
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../../common/endpoint/service/artifacts/constants';
import type {
  ExceptionsPrivileges,
  ExceptionsService,
} from '../../../lib/exceptions/logic/service';
import { ExceptionsValidationError } from './exception_errors';

/**
 * Provides methods for doing validation that apply across exception and value lists entries
 */
export class ExceptionsValidator {
  private readonly exceptionsService: ExceptionsService;
  private readonly request?: KibanaRequest;

  static isSiemException(item: { listId: string }): boolean {
    return !ALL_ENDPOINT_ARTIFACT_LIST_IDS.includes(item.listId);
  }

  constructor(
    exceptionsService: ExceptionsService,
    /**
     * Request is optional only because it needs to be optional in the Lists ExceptionListClient
     */
    request?: KibanaRequest
  ) {
    this.exceptionsService = exceptionsService;
    this.request = request;
  }

  private async validateHasExceptionsPrivileges(privilege: ExceptionsPrivileges): Promise<void> {
    if (!(await this.exceptionsService.hasPrivileges(privilege, this.request))) {
      throw new ExceptionsValidationError('Exceptions authorization failure', 403);
    }
  }

  private async validateHasReadPrivilege(): Promise<void> {
    return this.validateHasExceptionsPrivileges('showExceptionsAndValueLists');
  }

  private async validateHasWritePrivilege(): Promise<void> {
    return this.validateHasExceptionsPrivileges('crudExceptionsAndValueLists');
  }

  public async validatePreCreateList(item: CreateExceptionListOptions) {
    await this.validateHasWritePrivilege();
    return item;
  }

  public async validatePreDeleteList(): Promise<void> {
    await this.validateHasWritePrivilege();
  }

  public async validatePreUpdateList(item: UpdateExceptionListOptions) {
    await this.validateHasWritePrivilege();
    return item;
  }

  public async validatePreFindList(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  public async validatePreCreateItem(item: CreateExceptionListItemOptions) {
    await this.validateHasWritePrivilege();
    return item;
  }

  public async validatePreUpdateItem(item: UpdateExceptionListItemOptions) {
    await this.validateHasWritePrivilege();
    return item;
  }

  public async validatePreDeleteItem(): Promise<void> {
    await this.validateHasWritePrivilege();
  }

  public async validatePreGetOneItem(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  public async validatePreFindMultiItems(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  public async validatePreImport(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  public async validatePreExport(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  public async validatePreFindSingleItem(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  public async validatePreGetListSummary(): Promise<void> {
    await this.validateHasReadPrivilege();
  }
}
