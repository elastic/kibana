/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '@kbn/securitysolution-list-constants';

import {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '../../../../../lists/server';
import { EXCEPTIONABLE_ENDPOINT_EVENT_FIELDS } from '../../../../common/endpoint/exceptions/exceptionable_endpoint_event_fields';

import { ExceptionItemLikeOptions } from '../types';

import { BaseValidator } from './base_validator';
import { EndpointArtifactExceptionValidationError } from './errors';

function validateField(field: string) {
  if (!EXCEPTIONABLE_ENDPOINT_EVENT_FIELDS.includes(field)) {
    return `invalid field: ${field}`;
  }
}

const EntrySchema = schema.object({
  field: schema.string({ validate: validateField }),
  operator: schema.oneOf([schema.literal('included'), schema.literal('excluded')]),
  type: schema.oneOf([schema.literal('match'), schema.literal('match_any')]),
  value: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
});

const NestedEntrySchema = schema.object({
  field: schema.string({ validate: validateField }),
  type: schema.literal('nested'),
  entries: schema.arrayOf(EntrySchema),
});

const EntriesSchema = schema.oneOf([EntrySchema, NestedEntrySchema]);

const EventFilterDataSchema = schema.object(
  {
    entries: schema.arrayOf(EntriesSchema, { minSize: 1 }),
  },
  {
    unknowns: 'ignore',
  }
);

export class EventFilterValidator extends BaseValidator {
  static isEventFilter(item: { listId: string }): boolean {
    return item.listId === ENDPOINT_EVENT_FILTERS_LIST_ID;
  }

  async validatePreCreateItem(item: CreateExceptionListItemOptions) {
    await this.validateCanManageEndpointArtifacts();
    await this.validateEventFilterData(item);

    // user can always create a global entry so additional checks not needed
    if (this.isItemByPolicy(item)) {
      await this.validateCanCreateByPolicyArtifacts(item);
      await this.validateByPolicyItem(item);
    }

    return item;
  }

  async validatePreUpdateItem(
    _updatedItem: UpdateExceptionListItemOptions,
    currentItem: ExceptionListItemSchema
  ): Promise<UpdateExceptionListItemOptions> {
    const updatedItem = _updatedItem as ExceptionItemLikeOptions;

    await this.validateCanManageEndpointArtifacts();
    await this.validateEventFilterData(updatedItem);

    try {
      await this.validateCanCreateByPolicyArtifacts(updatedItem);
    } catch (noByPolicyAuthzError) {
      // Not allowed to create/update by policy data. Validate that the effective scope of the item
      // remained unchanged with this update or was set to `global` (only allowed update). If not,
      // then throw the validation error that was catch'ed
      if (this.wasByPolicyEffectScopeChanged(updatedItem, currentItem)) {
        throw noByPolicyAuthzError;
      }
    }

    await this.validateByPolicyItem(updatedItem);
    return _updatedItem;
  }

  private async validateEventFilterData(item: ExceptionItemLikeOptions): Promise<void> {
    await this.validateBasicData(item);

    try {
      EventFilterDataSchema.validate(item);
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }
  }
}
