/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { BaseValidator } from './base_validator';
import { ExceptionItemLikeOptions } from '../types';
import {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '../../../../../lists/server';

export class TrustedAppValidator extends BaseValidator {
  static isTrustedApp(item: ExceptionItemLikeOptions): boolean {
    return item.listId === ENDPOINT_TRUSTED_APPS_LIST_ID;
  }

  async validatePreCreateItem(
    item: CreateExceptionListItemOptions
  ): Promise<CreateExceptionListItemOptions> {
    await this.validateCanManageEndpointArtifacts();
    await this.validateCanCreateByPolicyArtifacts(item);
    await this.validateByPolicyItem(item);

    return item;
  }

  async validatePreUpdateItem(
    item: UpdateExceptionListItemOptions
  ): Promise<UpdateExceptionListItemOptions> {
    // FIXME:PT implement method
    return item;
  }

  // 2. validate data is valid (retrieve prior schema for this one)
}
