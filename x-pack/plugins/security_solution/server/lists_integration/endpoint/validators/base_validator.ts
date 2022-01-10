/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExceptionItemLikeOptions } from '../types';
import { getEndpointAuthzInitialState } from '../../../../common/endpoint/service/authz';
import { isArtifactByPolicy } from '../../../../common/endpoint/service/artifacts';
import { OperatingSystem } from '../../../../common/endpoint/types';

const BasicEndpointExceptionDataSchema = schema.object(
  {
    // must have a name
    name: schema.string({ minLength: 1, maxLength: 256 }),

    description: schema.maybe(schema.string({ minLength: 0, maxLength: 256, defaultValue: '' })),

    // We only support agnostic entries
    namespaceType: schema.literal('agnostic'),

    // only one OS per entry
    osTypes: schema.arrayOf(
      schema.oneOf([
        schema.literal(OperatingSystem.WINDOWS),
        schema.literal(OperatingSystem.LINUX),
        schema.literal(OperatingSystem.MAC),
      ]),
      { minSize: 1, maxSize: 1 }
    ),
  },
  // Because we are only validating some fields from the Exception Item, we set `unknowns` to `true` here
  { unknowns: 'allow' }
);

/**
 * Provides base methods for doing validation that apply across endpoint exception entries
 */
export class BaseValidator {
  private readonly endpointAuthzPromise: ReturnType<EndpointAppContextService['getEndpointAuthz']>;

  constructor(
    protected readonly endpointAppContext: EndpointAppContextService,
    /**
     * Request is optional only because it needs to be optional in the Lists ExceptionListClient
     */
    private readonly request?: KibanaRequest
  ) {
    if (this.request) {
      this.endpointAuthzPromise = this.endpointAppContext.getEndpointAuthz(this.request);
    } else {
      this.endpointAuthzPromise = Promise.resolve(getEndpointAuthzInitialState());
    }
  }

  protected isItemByPolicy(item: ExceptionItemLikeOptions): boolean {
    return isArtifactByPolicy(item);
  }

  protected async validateCanManageEndpointArtifacts(): Promise<void> {
    if (!(await this.endpointAuthzPromise).canAccessEndpointManagement) {
      throw new Error('Not authorized');
    }
  }

  /**
   * validates some basic common data that can be found across all endpoint exceptions
   * @param item
   * @protected
   */
  protected async validateBasicData(item: ExceptionItemLikeOptions) {
    BasicEndpointExceptionDataSchema.validate(item);
  }

  protected async validateCanCreateByPolicyArtifacts(
    item: ExceptionItemLikeOptions
  ): Promise<void> {
    if (
      this.isItemByPolicy(item) &&
      !(await this.endpointAuthzPromise).canCreateArtifactsByPolicy
    ) {
      throw new Error('Not authorized to create artifacts by policy');
    }
  }

  /**
   * Validates that by-policy artifacts is permitted and that each policy referenced in the item is valid
   * @protected
   */
  protected async validateByPolicyItem(item: ExceptionItemLikeOptions): Promise<void> {
    if (this.isItemByPolicy(item)) {
      // FIXME:PT implement method
    }
  }
}
