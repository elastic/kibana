/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from '../../../../../src/core/public';
import { Type } from '../../common/schemas';

export interface ApiParams {
  http: HttpStart;
  signal: AbortSignal;
}
export type ApiPayload<T extends ApiParams> = Omit<T, 'http' | 'signal'>;

export interface FindListsParams extends ApiParams {
  pageSize: number | undefined;
  pageIndex: number | undefined;
}

export interface ImportListParams extends ApiParams {
  file: File;
  listId: string | undefined;
  type: Type | undefined;
}

export interface DeleteListParams extends ApiParams {
  id: string;
}

export interface ExportListParams extends ApiParams {
  listId: string;
}
