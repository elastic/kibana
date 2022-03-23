/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { BaseDataGenerator } from './base_data_generator';
import { ExceptionsListItemGenerator } from './exceptions_list_item_generator';
import { BY_POLICY_ARTIFACT_TAG_PREFIX, GLOBAL_ARTIFACT_TAG } from '../service/artifacts';

const EFFECT_SCOPE_TYPES = [BY_POLICY_ARTIFACT_TAG_PREFIX, GLOBAL_ARTIFACT_TAG];
export class EventFilterGenerator extends BaseDataGenerator<CreateExceptionListItemSchema> {
  generate(overrides: Partial<ExceptionListItemSchema> = {}): CreateExceptionListItemSchema {
    const eventFilterGenerator = new ExceptionsListItemGenerator();
    const eventFilterData: CreateExceptionListItemSchema = eventFilterGenerator.generateEventFilter(
      {
        name: `Generated event ${this.randomString(5)}`,
        item_id: `generator_endpoint_event_filter_${this.randomUUID()}`,
        list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
        os_types: [this.randomOSFamily()] as CreateExceptionListItemSchema['os_types'],
        tags: [this.randomChoice(EFFECT_SCOPE_TYPES)],
        _version: undefined,
        created_at: undefined,
        created_by: undefined,
        id: undefined,
        tie_breaker_id: undefined,
        updated_at: undefined,
        updated_by: undefined,
        ...overrides,
      }
    );

    return eventFilterData;
  }
}
