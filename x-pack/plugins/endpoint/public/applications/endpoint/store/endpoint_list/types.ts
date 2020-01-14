/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// FIXME: temporary until server defined `interface` is moved to a module we can reference
export interface EndpointListData {
  endpoints: object[];
  request_page_size: number;
  request_index: number;
  total: number;
}

export type EndpointListState = EndpointListData;
