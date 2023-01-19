/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityPublicPluginsStart, useFetcher } from '..';

export const useKibanaSpace = () => {
  const { services } = useKibana<ObservabilityPublicPluginsStart>();

  const {
    data: space,
    loading,
    error,
  } = useFetcher(() => {
    return services.spaces?.getActiveSpace();
  }, [services.spaces]);

  return {
    space,
    loading,
    error,
  };
};
