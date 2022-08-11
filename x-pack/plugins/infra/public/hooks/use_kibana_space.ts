/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';
import type { Space } from '@kbn/spaces-plugin/public';
import { useKibanaContextForPlugin } from './use_kibana';

export type ActiveSpace =
  | { isLoading: true; error: undefined; space: undefined }
  | { isLoading: false; error: Error; space: undefined }
  | { isLoading: false; error: undefined; space: Space };

export const useActiveKibanaSpace = (): ActiveSpace => {
  const kibana = useKibanaContextForPlugin();

  const asyncActiveSpace = useAsync(kibana.services.spaces.getActiveSpace);

  if (asyncActiveSpace.loading) {
    return {
      isLoading: true,
      error: undefined,
      space: undefined,
    };
  } else if (asyncActiveSpace.error) {
    return {
      isLoading: false,
      error: asyncActiveSpace.error,
      space: undefined,
    };
  } else {
    return {
      isLoading: false,
      error: undefined,
      space: asyncActiveSpace.value!,
    };
  }
};
