/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from 'kibana/public';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '../../../../../public/shared_imports';
import { Immutable } from '../../../../../common/endpoint/types';
// import { EXCEPTION_LIST_ITEM_URL } from '../../../../../../../plugins/lists/common/constants';

export interface EventFiltersService {
  addEventFilter(
    exception: Immutable<ExceptionListItemSchema | CreateExceptionListItemSchema>
  ): Promise<ExceptionListItemSchema>;
}

// TODO: to be moved with right fields.
const EVENT_FILTER_LIST = {
  name: 'Endpoint Event Filter List',
  namespace_type: 'agnostic',
  description: 'Endpoint Event Filter List',
  list_id: 'endpointEventFilterList',
  type: 'endpoint_event_filter',
};

export class EventFiltersHttpService implements EventFiltersService {
  constructor(private http: HttpStart) {
    http.post<ExceptionListItemSchema>('/api/exception_lists', {
      body: JSON.stringify(EVENT_FILTER_LIST),
    });
  }

  async addEventFilter(exception: ExceptionListItemSchema | CreateExceptionListItemSchema) {
    // TODO: change this url path string by a constant
    return this.http.post<ExceptionListItemSchema>('/api/exception_lists/items', {
      body: JSON.stringify(exception),
    });
  }
}
