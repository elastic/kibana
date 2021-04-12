/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListType } from '../../../../../lists/common/shared_exports';

export const EVENT_FILTER_LIST_ID = '.endpointEventFilterList';
export const EVENT_FILTER_LIST_TYPE: ExceptionListType = 'endpoint_events';

export const EVENT_FILTER_LIST = {
  name: 'Endpoint Event Filter List',
  namespace_type: 'agnostic',
  description: 'Endpoint Event Filter List',
  list_id: EVENT_FILTER_LIST_ID,
  type: EVENT_FILTER_LIST_TYPE,
};

export const EXCEPTION_LIST_ITEM_URL = '/api/exception_lists/items';
export const EXCEPTION_LIST_URL = '/api/exception_lists';
