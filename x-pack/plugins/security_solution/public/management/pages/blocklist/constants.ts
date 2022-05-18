/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ExceptionListType,
  ExceptionListTypeEnum,
  CreateExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_BLOCKLISTS_LIST_DESCRIPTION,
  ENDPOINT_BLOCKLISTS_LIST_ID,
  ENDPOINT_BLOCKLISTS_LIST_NAME,
} from '@kbn/securitysolution-list-constants';

export const BLOCKLISTS_LIST_TYPE: ExceptionListType = ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS;

export const BLOCKLISTS_LIST_DEFINITION: CreateExceptionListSchema = {
  name: ENDPOINT_BLOCKLISTS_LIST_NAME,
  namespace_type: 'agnostic',
  description: ENDPOINT_BLOCKLISTS_LIST_DESCRIPTION,
  list_id: ENDPOINT_BLOCKLISTS_LIST_ID,
  type: BLOCKLISTS_LIST_TYPE,
};

export const SEARCHABLE_FIELDS: Readonly<string[]> = [
  `name`,
  `description`,
  'item_id',
  `entries.value`,
  `entries.entries.value`,
  `comments.comment`,
];
