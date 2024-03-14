/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Space } from '@kbn/spaces-plugin/common';
import { useKibana } from './use_kibana';
import { useFetcher } from './use_fetcher';

export const useKibanaSpace = () => {
  const { spaces } = useKibana().services;

  const {
    data: space,
    loading,
    error,
  } = useFetcher<Promise<Space> | undefined>(() => {
    return spaces?.getActiveSpace();
  }, [spaces]);

  return {
    space,
    loading,
    error,
  };
};
