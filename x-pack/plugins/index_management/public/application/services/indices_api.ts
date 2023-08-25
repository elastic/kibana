/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRequest } from './use_request';
import { Index, INTERNAL_API_BASE_PATH } from '../../../common';

export const useLoadIndex = (indexName: string) => {
  return useRequest<Index>({
    path: `${INTERNAL_API_BASE_PATH}/indices/${indexName}`,
    method: 'get',
  });
};
