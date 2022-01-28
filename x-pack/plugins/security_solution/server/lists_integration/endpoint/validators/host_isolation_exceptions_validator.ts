/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { BaseValidator } from './base_validator';
import { EndpointArtifactExceptionValidationError } from './errors';

import { ExceptionItemLikeOptions } from '../types';

import {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '../../../../../lists/server';

export class HostIsolationExceptionsValidator extends BaseValidator {
  static isHostIsolationException(listId: string): boolean {
    return listId === ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID;
  }

  async validatePreCreateItem(
    item: CreateExceptionListItemOptions
  ): Promise<CreateExceptionListItemOptions> {
    // must be plat -- authz.canIsolateHost
    await this.validateCanIsolateHosts();
    // policy validation -- validateByPolicyItem
    await this.validateByPolicyItem(item);
    // ip validation - this schema type might already exist
    await this.validateHostIsolationData(item);

    return item;
  }

  async validatePreUpdateItem(
    _updatedItem: UpdateExceptionListItemOptions,
    currentItem: ExceptionListItemSchema
  ): Promise<UpdateExceptionListItemOptions> {
    await this.validateCanIsolateHosts();
    // must be plat
    // policy validation
    // ip validation

    return _updatedItem;
  }

  async validatePreGetOneItem(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreSummary(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreDeleteItem(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreExport(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreSingleListFind(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreMultiListFind(): Promise<void> {
    await this.validateCanManageEndpointArtifacts();
  }

  async validatePreImport(): Promise<void> {
    throw new EndpointArtifactExceptionValidationError(
      'Import is not supported for Endpoint artifact exceptions'
    );
  }

  private async validateHostIsolationData(item: ExceptionItemLikeOptions): Promise<void> {
    await this.validateBasicData(item);
  }
}
