/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementState } from '../../types';

export const endpointListData = (state: ManagementState) => state.endpoints;

export const endpointListPageIndex = (state: ManagementState) => state.pageIndex;

export const endpointListPageSize = (state: ManagementState) => state.pageSize;

export const endpointTotalHits = (state: ManagementState) => state.total;
