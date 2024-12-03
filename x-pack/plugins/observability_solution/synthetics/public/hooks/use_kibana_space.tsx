/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Space } from '@kbn/spaces-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { ClientPluginsStart } from '../plugin';

export const useKibanaSpace = () => {
  const { services } = useKibana<ClientPluginsStart>();

  const {
    data: space,
    loading,
    error,
  } = useFetcher<Promise<Space>>(() => {
    return services.spaces?.getActiveSpace() ?? Promise.resolve({ id: DEFAULT_SPACE_ID } as Space);
  }, [services.spaces]);

  return {
    space,
    loading,
    error,
  };
};
