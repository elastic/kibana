/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { listMock } from '@kbn/lists-plugin/server/mocks';
import { BaseValidator } from './base_validator';
import { ExceptionItemLikeOptions } from '../types';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../../../../common/endpoint/service/artifacts';

/**
 * Exposes all `protected` methods of `BaseValidator` by prefixing them with an underscore.
 */
export class BaseValidatorMock extends BaseValidator {
  _isItemByPolicy(item: ExceptionItemLikeOptions): boolean {
    return this.isItemByPolicy(item);
  }

  async _isAllowedToCreateArtifactsByPolicy(): Promise<boolean> {
    return this.isAllowedToCreateArtifactsByPolicy();
  }

  async _validateCanManageEndpointArtifacts(): Promise<void> {
    return this.validateCanManageEndpointArtifacts();
  }

  async _validateBasicData(item: ExceptionItemLikeOptions) {
    return this.validateBasicData(item);
  }

  async _validateCanCreateByPolicyArtifacts(item: ExceptionItemLikeOptions): Promise<void> {
    return this.validateCanCreateByPolicyArtifacts(item);
  }

  async _validateByPolicyItem(item: ExceptionItemLikeOptions): Promise<void> {
    return this.validateByPolicyItem(item);
  }

  _wasByPolicyEffectScopeChanged(
    updatedItem: ExceptionItemLikeOptions,
    currentItem: Pick<ExceptionListItemSchema, 'tags'>
  ): boolean {
    return this.wasByPolicyEffectScopeChanged(updatedItem, currentItem);
  }
}

export const createExceptionItemLikeOptionsMock = (
  overrides: Partial<ExceptionItemLikeOptions> = {}
): ExceptionItemLikeOptions => {
  return {
    ...listMock.getCreateExceptionListItemOptionsMock(),
    namespaceType: 'agnostic',
    osTypes: ['windows'],
    tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`],
    ...overrides,
  };
};
