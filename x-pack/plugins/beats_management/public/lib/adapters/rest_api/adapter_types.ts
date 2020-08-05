/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FlatObject } from '../../../frontend_types';

export interface RestAPIAdapter {
  get<ResponseData>(url: string, query?: FlatObject<object>): Promise<ResponseData>;
  post<ResponseData>(url: string, body?: { [key: string]: any }): Promise<ResponseData>;
  delete<T>(url: string): Promise<T>;
  put<ResponseData>(url: string, body?: any): Promise<ResponseData>;
}
