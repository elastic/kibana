/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { BaseDataGenerator } from './base_data_generator';
import { getCreateExceptionListItemSchemaMock } from '../../../../lists/common/schemas/request/create_exception_list_item_schema.mock';

export class EventFilterGenerator extends BaseDataGenerator<CreateExceptionListItemSchema> {
  generate(): CreateExceptionListItemSchema {
    const overrides: Partial<CreateExceptionListItemSchema> = {
      name: `generator event ${this.randomString(5)}`,
      list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
      item_id: `generator_endpoint_event_filter_${this.randomUUID()}`,
      os_types: [this.randomOSFamily()] as CreateExceptionListItemSchema['os_types'],
      tags: ['policy:all'],
      namespace_type: 'agnostic',
      meta: undefined,
    };

    return Object.assign<CreateExceptionListItemSchema, Partial<CreateExceptionListItemSchema>>(
      getCreateExceptionListItemSchemaMock(),
      overrides
    );
  }
}
