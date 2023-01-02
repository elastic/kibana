/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CriteriaWithPagination } from '@elastic/eui';

export interface Meta {
  from: number;
  size: number;
  total: number;
}

export interface EngineListDetails {
  name: string;
  indices: string[];
  last_updated: string;
  document_count: number;
}
export const DEFAULT_META = {
  from: 1,
  size: 3,
  total: 0,
};

export const convertMetaToPagination = (meta: Meta) => ({
  pageIndex: meta.from - 1,
  pageSize: meta.size,
  totalItemCount: meta.total,
});
export const updateMetaPageIndex = (oldState: Meta, newPageIndex: number) => {
  const newMetaState = { ...oldState };
  newMetaState.from = newPageIndex;
  return newMetaState;
};
export interface EnginesListTableProps {
  enginesList: EngineListDetails[];
  loading: boolean;
  isLoading?: boolean;
  meta: Meta;
  onChange: (criteria: CriteriaWithPagination<EngineListDetails>) => void;
}
export interface EnginesListAPIResponse {
  results: EngineListDetails[];
  meta: Meta;
}
