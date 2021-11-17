/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { DeepPartial } from 'utility-types';
import { BaseDataGenerator } from './base_data_generator';
import { POLICY_REFERENCE_PREFIX } from '../service/trusted_apps/mapping';

export class ExceptionsListItemGenerator extends BaseDataGenerator<ExceptionListItemSchema> {
  generate(overrides: DeepPartial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    return {
      _version: this.randomString(5),
      comments: [],
      created_at: this.randomPastDate(),
      created_by: this.randomUser(),
      description: 'created by ExceptionListItemGenerator',
      entries: [
        {
          entries: [
            { field: 'nested.field', operator: 'included', type: 'match', value: 'some value' },
          ],
          field: 'some.parentField',
          type: 'nested',
        },
        {
          field: 'some.not.nested.field',
          operator: 'included',
          type: 'match',
          value: 'some value',
        },
      ],
      id: this.seededUUIDv4(),
      item_id: this.seededUUIDv4(),
      list_id: 'endpoint_list_id',
      meta: {},
      name: `Generated Exception (${this.randomString(5)})`,
      namespace_type: 'agnostic',
      os_types: [this.randomOSFamily()] as ExceptionListItemSchema['os_types'],
      tags: [`${POLICY_REFERENCE_PREFIX}all`],
      tie_breaker_id: this.seededUUIDv4(),
      type: 'simple',
      updated_at: '2020-04-20T15:25:31.830Z',
      updated_by: this.randomUser(),
      ...(overrides || {}),
    };
  }
}
