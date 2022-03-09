/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { parse, stringify } from 'query-string';

// FIXME:PT delete and use common hook once @parkiino merges
export function useUrlParams<T = Record<string, string | number | null | undefined>>(): {
  urlParams: T;
  toUrlParams: (params?: T) => string;
} {
  const { search } = useLocation();
  return useMemo(() => {
    const urlParams = parse(search) as unknown as T;
    return {
      urlParams,
      toUrlParams: (params: T = urlParams) => stringify(params as unknown as object),
    };
  }, [search]);
}
