/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExceptionListType,
  ExceptionListTypeEnum,
  EXCEPTION_LIST_URL,
  EXCEPTION_LIST_ITEM_URL,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_NAME,
  ENDPOINT_EVENT_FILTERS_LIST_DESCRIPTION,
} from '../../../../common/shared_imports';

export const EVENT_FILTER_LIST_TYPE: ExceptionListType = ExceptionListTypeEnum.ENDPOINT_EVENTS;
export const EVENT_FILTER_LIST = {
  name: ENDPOINT_EVENT_FILTERS_LIST_NAME,
  namespace_type: 'agnostic',
  description: ENDPOINT_EVENT_FILTERS_LIST_DESCRIPTION,
  list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
  type: EVENT_FILTER_LIST_TYPE,
};

export { ENDPOINT_EVENT_FILTERS_LIST_ID, EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL };
