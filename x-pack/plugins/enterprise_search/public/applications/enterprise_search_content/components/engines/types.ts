/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Meta {
  from: number;
  size: number;
  total: number;
}

export const DEFAULT_META = {
  from: 0,
  size: 10,
  total: 0,
};

export const convertMetaToPagination = (meta: Meta) => {
  return {
    pageIndex: meta.from / meta.size,
    pageSize: meta.size,
    totalItemCount: meta.total,
  };
};
export const updateMetaPageIndex = (oldState: Meta, newPageIndex: number) => {
  return { ...oldState, from: newPageIndex * oldState.size };
};
