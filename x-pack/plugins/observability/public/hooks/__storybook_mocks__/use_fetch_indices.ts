/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Index, UseFetchIndicesResponse } from '../use_fetch_indices';

export const useFetchIndices = (): UseFetchIndicesResponse => {
  return {
    isLoading: false,
    isError: false,
    isSuccess: true,
    data: [
      ...Array(10)
        .fill(0)
        .map((_, i) => `.index-${i}`),
      ...Array(10)
        .fill(0)
        .map((_, i) => `.some-other-index-${i}`),
    ] as Index[],
  };
};
