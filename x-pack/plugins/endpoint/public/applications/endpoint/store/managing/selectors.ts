/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementListState } from '../../types';

export const listData = (state: ManagementListState) => state.endpoints;

export const pageIndex = (state: ManagementListState) => state.pageIndex;

export const pageSize = (state: ManagementListState) => state.pageSize;

export const totalHits = (state: ManagementListState) => state.total;

export const isLoading = (state: ManagementListState) => state.loading;
