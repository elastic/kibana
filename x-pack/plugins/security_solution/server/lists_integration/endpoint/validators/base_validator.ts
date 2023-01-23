/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { isEqual } from 'lodash/fp';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { EndpointAuthz } from '../../../../common/endpoint/types/authz';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { ExceptionItemLikeOptions } from '../types';
import { getEndpointAuthzInitialState } from '../../../../common/endpoint/service/authz';
import {
  getPolicyIdsFromArtifact,
  isArtifactByPolicy,
} from '../../../../common/endpoint/service/artifacts';
import { EndpointArtifactExceptionValidationError } from './errors';
import type { FeatureKeys } from '../../../endpoint/services/feature_usage/service';

export const BasicEndpointExceptionDataSchema = schema.object(
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
  // Because we are only validating some fields from the Exception Item, we set `unknowns` to `ignore` here
  { unknowns: 'ignore' }
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

  public notifyFeatureUsage(item: ExceptionItemLikeOptions, featureKey: FeatureKeys): void {
    if (
      (this.isItemByPolicy(item) && featureKey.endsWith('_BY_POLICY')) ||
      (!this.isItemByPolicy(item) && !featureKey.endsWith('_BY_POLICY'))
    ) {
      this.endpointAppContext.getFeatureUsageService().notifyUsage(featureKey);
    }
  }

  protected async validateHasPrivilege(privilege: keyof EndpointAuthz): Promise<void> {
    if (!(await this.endpointAuthzPromise)[privilege]) {
      throw new EndpointArtifactExceptionValidationError('Endpoint authorization failure', 403);
    }
  }

  protected isItemByPolicy(item: ExceptionItemLikeOptions): boolean {
    return isArtifactByPolicy(item);
  }

  protected async isAllowedToCreateArtifactsByPolicy(): Promise<boolean> {
    return (await this.endpointAuthzPromise).canCreateArtifactsByPolicy;
  }

  protected async validateCanManageEndpointArtifacts(): Promise<void> {
    if (!(await this.endpointAuthzPromise).canAccessEndpointManagement) {
      throw new EndpointArtifactExceptionValidationError('Endpoint authorization failure', 403);
    }
  }

  protected async validateCanIsolateHosts(): Promise<void> {
    if (!(await this.endpointAuthzPromise).canIsolateHost) {
      throw new EndpointArtifactExceptionValidationError('Endpoint authorization failure', 403);
    }
  }

  /**
   * validates some basic common data that can be found across all endpoint exceptions
   * @param item
   * @protected
   */
  protected async validateBasicData(item: ExceptionItemLikeOptions) {
    try {
      BasicEndpointExceptionDataSchema.validate(item);
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }
  }

  protected async validateCanCreateByPolicyArtifacts(
    item: ExceptionItemLikeOptions
  ): Promise<void> {
    if (this.isItemByPolicy(item) && !(await this.isAllowedToCreateArtifactsByPolicy())) {
      throw new EndpointArtifactExceptionValidationError(
        'Your license level does not allow create/update of policy artifacts',
        403
      );
    }
  }

  /**
   * Validates that by-policy artifacts is permitted and that each policy referenced in the item is valid
   * @protected
   */
  protected async validateByPolicyItem(item: ExceptionItemLikeOptions): Promise<void> {
    if (this.isItemByPolicy(item)) {
      const { packagePolicy, internalReadonlySoClient } =
        this.endpointAppContext.getInternalFleetServices();
      const policyIds = getPolicyIdsFromArtifact(item);

      if (policyIds.length === 0) {
        return;
      }

      const policiesFromFleet = await packagePolicy.getByIDs(internalReadonlySoClient, policyIds, {
        ignoreMissing: true,
      });

      if (!policiesFromFleet) {
        throw new EndpointArtifactExceptionValidationError(
          `invalid policy ids: ${policyIds.join(', ')}`
        );
      }

      const invalidPolicyIds = policyIds.filter(
        (policyId) => !policiesFromFleet.some((policy) => policyId === policy.id)
      );

      if (invalidPolicyIds.length) {
        throw new EndpointArtifactExceptionValidationError(
          `invalid policy ids: ${invalidPolicyIds.join(', ')}`
        );
      }
    }
  }

  /**
   * If the item being updated is `by policy`, method validates if anyting was changes in regard to
   * the effected scope of the by policy settings.
   *
   * @param updatedItem
   * @param currentItem
   * @protected
   */
  protected wasByPolicyEffectScopeChanged(
    updatedItem: ExceptionItemLikeOptions,
    currentItem: Pick<ExceptionListItemSchema, 'tags'>
  ): boolean {
    // if global, then return. Nothing to validate and setting the trusted app to global is allowed
    if (!this.isItemByPolicy(updatedItem)) {
      return false;
    }

    if (updatedItem.tags) {
      return !isEqual(
        getPolicyIdsFromArtifact({ tags: updatedItem.tags }),
        getPolicyIdsFromArtifact(currentItem)
      );
    }

    return false;
  }
}
