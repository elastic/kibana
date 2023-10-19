/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryClient } from '@tanstack/react-query';

import { TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';

export const useRefreshTransformList = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries([TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORM_NODES]);
    queryClient.invalidateQueries([TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORMS]);
    queryClient.invalidateQueries([TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORMS_STATS]);
    queryClient.invalidateQueries([TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORM_AUDIT_MESSAGES]);
  };
};
