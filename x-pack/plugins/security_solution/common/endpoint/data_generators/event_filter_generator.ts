/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseDataGenerator } from './base_data_generator';
import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '../../../../lists/common/constants';
import { CreateExceptionListItemSchema } from '../../../../lists/common';
import { getCreateEndpointListItemSchemaMock } from '../../../../lists/common/schemas/request/create_endpoint_list_item_schema.mock';

export class EventFilterGenerator extends BaseDataGenerator<CreateExceptionListItemSchema> {
  generate(): CreateExceptionListItemSchema {
    return Object.assign(getCreateEndpointListItemSchemaMock(), {
      name: `generator event ${this.randomString(5)}`,
      list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
      item_id: `generator_endpoint_event_filter_${this.randomUUID()}`,
      os_types: [this.randomOS()],
      tags: ['policy:all'],
    });
  }
}
