/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { BaseDataGenerator } from './base_data_generator';
import { POLICY_REFERENCE_PREFIX } from '../service/trusted_apps/mapping';
import { ConditionEntryField } from '../types';

export class ExceptionsListItemGenerator extends BaseDataGenerator<ExceptionListItemSchema> {
  generate(overrides: Partial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    return {
      _version: this.randomString(5),
      comments: [],
      created_at: this.randomPastDate(),
      created_by: this.randomUser(),
      description: 'created by ExceptionListItemGenerator',
      entries: [
        {
          field: ConditionEntryField.HASH,
          operator: 'included',
          type: 'match',
          value: '1234234659af249ddf3e40864e9fb241',
        },
        {
          field: ConditionEntryField.PATH,
          operator: 'included',
          type: 'match',
          value:
            overrides.os_types && overrides.os_types[0] === 'windows'
              ? 'c:\\fol\\bin.exe'
              : '/one/two/three',
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
