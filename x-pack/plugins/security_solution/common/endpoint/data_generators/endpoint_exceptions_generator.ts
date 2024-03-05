/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  ListOperatorType,
} from '@kbn/securitysolution-io-ts-list-types';
import { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { LIST_ITEM_ENTRY_OPERATOR_TYPES } from './common/artifact_list_item_entry_values';
import { exceptionItemToCreateExceptionItem } from './exceptions_list_item_generator';
import { BaseDataGenerator } from './base_data_generator';
import { GLOBAL_ARTIFACT_TAG } from '../service/artifacts';
import { ENDPOINT_EVENTS_LOG_INDEX_FIELDS } from './common/alerts_ecs_fields';

export class EndpointExceptionsGenerator extends BaseDataGenerator<ExceptionListItemSchema> {
  generate(overrides: Partial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    return {
      name: `Generated Exception (${this.randomString(5)})`,
      comments: [],
      description: 'created by EndpointExceptionsGenerator',
      id: this.seededUUIDv4(),
      item_id: this.seededUUIDv4(),
      list_id: ENDPOINT_LIST_ID,
      tags: [GLOBAL_ARTIFACT_TAG],
      entries: this.randomEndpointExceptionEntries(1),
      meta: undefined,
      namespace_type: 'agnostic',
      os_types: [this.randomOSFamily()] as ExceptionListItemSchema['os_types'],
      created_at: this.randomPastDate(),
      created_by: this.randomUser(),
      updated_at: '2020-04-20T15:25:31.830Z',
      expire_time: undefined,
      updated_by: this.randomUser(),
      _version: this.randomString(5),
      type: 'simple',
      tie_breaker_id: this.seededUUIDv4(),
      ...overrides,
    };
  }

  generateEndpointExceptionForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchema {
    return {
      ...exceptionItemToCreateExceptionItem(this.generate()),
      ...overrides,
    };
  }

  protected randomEndpointExceptionEntries(
    count: number = this.randomN(5)
  ): ExceptionListItemSchema['entries'] {
    const operatorTypes = LIST_ITEM_ENTRY_OPERATOR_TYPES.filter(
      (item) =>
        !(
          [
            ListOperatorTypeEnum.LIST,
            ListOperatorTypeEnum.NESTED,
            ListOperatorTypeEnum.EXISTS,
          ] as ListOperatorType[]
        ).includes(item)
    );
    const fieldList = ENDPOINT_EVENTS_LOG_INDEX_FIELDS.filter((field) => field.endsWith('.text'));

    return Array.from({ length: count || 1 }, () => {
      const operatorType = this.randomChoice(operatorTypes);

      return {
        field: this.randomChoice(fieldList),
        operator: 'included',
        type: operatorType,
        value:
          operatorType === ListOperatorTypeEnum.MATCH_ANY
            ? [this.randomString(10), this.randomString(10)]
            : this.randomString(10),
      };
    }) as ExceptionListItemSchema['entries'];
  }
}
