/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListSchema,
  ExceptionListType,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  EXCEPTION_LIST_URL,
  EXCEPTION_LIST_ITEM_URL,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_NAME,
  ENDPOINT_EVENT_FILTERS_LIST_DESCRIPTION,
} from '@kbn/securitysolution-list-constants';

export const EVENT_FILTER_LIST_TYPE: ExceptionListType = ExceptionListTypeEnum.ENDPOINT_EVENTS;
export const EVENT_FILTER_LIST_DEFINITION: CreateExceptionListSchema = {
  name: ENDPOINT_EVENT_FILTERS_LIST_NAME,
  namespace_type: 'agnostic',
  description: ENDPOINT_EVENT_FILTERS_LIST_DESCRIPTION,
  list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
  type: EVENT_FILTER_LIST_TYPE,
};

export const SEARCHABLE_FIELDS: Readonly<string[]> = [
  `name`,
  `description`,
  `entries.value`,
  `entries.entries.value`,
  `comments.comment`,
  `item_id`,
];

export { ENDPOINT_EVENT_FILTERS_LIST_ID, EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL };
