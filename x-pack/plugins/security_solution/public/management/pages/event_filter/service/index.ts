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

// TODO: pending to add Types
export interface EventFiltersService {
  addEventFilter(
    exception: Immutable<ExceptionListItemSchema | CreateExceptionListItemSchema>
  ): Promise<ExceptionListItemSchema>;
}

export class EventFiltersHttpService implements EventFiltersService {
  constructor(private http: HttpStart) {}

  async addEventFilter(exception: ExceptionListItemSchema | CreateExceptionListItemSchema) {
    return this.http.post<ExceptionListItemSchema>('apiCall', {
      body: JSON.stringify(exception),
    });
  }
}
