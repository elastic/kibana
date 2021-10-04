/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExceptionListType, ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_DESCRIPTION,
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_NAME,
} from '@kbn/securitysolution-list-constants';

export const HOST_ISOLATION_EXCEPTIONS_LIST_TYPE: ExceptionListType =
  ExceptionListTypeEnum.ENDPOINT_HOST_ISOLATION_EXCEPTIONS;

export const HOST_ISOLATION_EXCEPTIONS_LIST = {
  name: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_NAME,
  namespace_type: 'agnostic',
  description: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_DESCRIPTION,
  list_id: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
  type: HOST_ISOLATION_EXCEPTIONS_LIST_TYPE,
};
