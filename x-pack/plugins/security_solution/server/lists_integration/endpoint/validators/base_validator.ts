/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

/**
 * Provides base methods for doing validation that apply across endpoint exception entries
 */
export class BaseValidator {
  protected isItemByPolicy(item: ExceptionListItemSchema): boolean {
    // FIXME:PT implement method
  }

  /**
   * Validates that by-policy artifacts is permitted and that each policy referenced in the item is valid
   * @protected
   */
  protected async validateByPolicyItem(item: ExceptionListItemSchema): Promise<void> {
    if (this.isItemByPolicy(item)) {
      // FIXME:PT implement method
    }
  }

  async validatePreCreateItem(): Promise<void> {
    // FIXME:PT implement method
  }

  async validatePreUpdateItem(): Promise<void> {
    // FIXME:PT implement method
  }
}
