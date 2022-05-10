/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { BaseDataGenerator } from './base_data_generator';

const EFFECT_SCOPE_TYPES = ['policy:', 'policy:all'];

export class HostIsolationExceptionGenerator extends BaseDataGenerator<CreateExceptionListItemSchema> {
  generate(): CreateExceptionListItemSchema {
    const overrides: Partial<CreateExceptionListItemSchema> = {
      name: `generator exception ${this.randomString(5)}`,
      list_id: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
      item_id: `generator_endpoint_host_isolation_exception_${this.randomUUID()}`,
      os_types: ['windows', 'linux', 'macos'],
      tags: [this.randomChoice(EFFECT_SCOPE_TYPES)],
      namespace_type: 'agnostic',
      meta: undefined,
      description: `Description ${this.randomString(5)}`,
      entries: [
        {
          field: 'destination.ip',
          operator: 'included',
          type: 'match',
          value: this.randomIP(),
        },
      ],
    };

    return Object.assign<CreateExceptionListItemSchema, Partial<CreateExceptionListItemSchema>>(
      getCreateExceptionListItemSchemaMock(),
      overrides
    );
  }
}
