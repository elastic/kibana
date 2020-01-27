/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointListState } from './types';

export const endpointListData = (state: EndpointListState) => state.endpoints;

export const endpointListPageIndex = (state: EndpointListState) => state.request_index;

export const endpointListPageSize = (state: EndpointListState) => state.request_page_size;

export const endpointTotalHits = (state: EndpointListState) => state.total;
