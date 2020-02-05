/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementState } from '../../types';

export const listData = (state: ManagementState) => state.endpoints;

export const pageIndex = (state: ManagementState) => state.pageIndex;

export const pageSize = (state: ManagementState) => state.pageSize;

export const totalHits = (state: ManagementState) => state.total;

export const isLoading = (state: ManagementState) => state.loading;
