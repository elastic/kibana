/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';
import { BaseValidator, BasicEndpointExceptionDataSchema } from './base_validator';
import { EndpointArtifactExceptionValidationError } from './errors';
import type { ExceptionItemLikeOptions } from '../types';

import { isValidIPv4OrCIDR } from '../../../../common/endpoint/utils/is_valid_ip';

function validateIp(value: string) {
  if (!isValidIPv4OrCIDR(value)) {
    return `invalid ip: ${value}`;
  }
}

const EntrySchema = schema.object({
  field: schema.literal('destination.ip'),
  operator: schema.literal('included'),
  type: schema.literal('match'),
  value: schema.string({
    validate: validateIp,
  }),
});

const HostIsolationDataSchema = schema.object(
  {
    entries: schema.arrayOf(EntrySchema, { minSize: 1, maxSize: 1 }),
  },
  {
    unknowns: 'ignore',
  }
);

// use the baseSchema and overwrite the os_type
// to accept all OSs in the list for host isolation exception
const HostIsolationBasicDataSchema = BasicEndpointExceptionDataSchema.extends({
  osTypes: schema.arrayOf(
    schema.oneOf([
      schema.literal(OperatingSystem.WINDOWS),
      schema.literal(OperatingSystem.LINUX),
      schema.literal(OperatingSystem.MAC),
    ]),
    { minSize: 3, maxSize: 3 }
  ),
});

export class HostIsolationExceptionsValidator extends BaseValidator {
  static isHostIsolationException(item: { listId: string }): boolean {
    return item.listId === ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID;
  }

  protected async validateHasWritePrivilege(): Promise<void> {
    return this.validateHasPrivilege('canWriteHostIsolationExceptions');
  }

  protected async validateHasDeletePrivilege(): Promise<void> {
    return this.validateHasPrivilege('canDeleteHostIsolationExceptions');
  }

  protected async validateHasReadPrivilege(): Promise<void> {
    return this.validateHasPrivilege('canReadHostIsolationExceptions');
  }

  async validatePreCreateItem(
    item: CreateExceptionListItemOptions
  ): Promise<CreateExceptionListItemOptions> {
    await this.validateHasWritePrivilege();
    await this.validateHostIsolationData(item);
    await this.validateByPolicyItem(item);

    return item;
  }

  async validatePreUpdateItem(
    _updatedItem: UpdateExceptionListItemOptions
  ): Promise<UpdateExceptionListItemOptions> {
    const updatedItem = _updatedItem as ExceptionItemLikeOptions;

    await this.validateHasWritePrivilege();
    await this.validateHostIsolationData(updatedItem);
    await this.validateByPolicyItem(updatedItem);

    return _updatedItem;
  }

  async validatePreGetOneItem(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreSummary(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreDeleteItem(): Promise<void> {
    await this.validateHasDeletePrivilege();
  }

  async validatePreExport(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreSingleListFind(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreMultiListFind(): Promise<void> {
    await this.validateHasReadPrivilege();
  }

  async validatePreImport(): Promise<void> {
    throw new EndpointArtifactExceptionValidationError(
      'Import is not supported for Endpoint artifact exceptions'
    );
  }

  private async validateHostIsolationData(item: ExceptionItemLikeOptions): Promise<void> {
    try {
      HostIsolationBasicDataSchema.validate(item);
      HostIsolationDataSchema.validate(item);
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }
  }
}
