/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';

import { CriteriaWithPagination } from '@elastic/eui';

import { Meta } from '../../../../../common/types';

export interface Engine {
  name: string;
}
export interface EngineListDetails extends Engine {
  last_updated: string;
  document_count: number;
  indices: { index_count: number };
}

export interface EnginesListTableProps {
  items: EngineListDetails[];
  loading: boolean;
  noItemsMessage?: ReactNode;
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalItemCount: number;
    showPerPageOptions: boolean;
  };
  onChange(criteria: CriteriaWithPagination<EngineListDetails>): void;
}
export interface EnginesListAPIResponse {
  results: EngineListDetails[];
  meta: Meta;
}
