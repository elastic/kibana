/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAsync } from 'react-use';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';
import type { Space } from '../../../spaces/public';

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
