/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_TRUSTED_APPS_LIST_DESCRIPTION,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_NAME,
} from '@kbn/securitysolution-list-constants';

export const SEARCHABLE_FIELDS: Readonly<string[]> = [
  `name`,
  `description`,
  'item_id',
  `entries.value`,
  `entries.entries.value`,
];

export const TRUSTED_APPS_EXCEPTION_LIST_DEFINITION: CreateExceptionListSchema = {
  name: ENDPOINT_TRUSTED_APPS_LIST_NAME,
  namespace_type: 'agnostic',
  description: ENDPOINT_TRUSTED_APPS_LIST_DESCRIPTION,
  list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
  type: ExceptionListTypeEnum.ENDPOINT_TRUSTED_APPS,
};
