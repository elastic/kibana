/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';

/**
 * @description given an array index and page size, returns a slice of said array.
 */
export const usePageSlice = (data: any[] | undefined, pageIndex: number, pageSize: number) => {
  return useMemo(() => {
    if (!data) {
      return [];
    }

    const cursor = pageIndex * pageSize;
    return data.slice(cursor, cursor + pageSize);
  }, [data, pageIndex, pageSize]);
};
