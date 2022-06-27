/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { useKibanaServices } from './use_kibana_services';

export function useStaticDataView() {
  const { observability } = useKibanaServices();
  const { data, loading } = useFetcher(async () => {
    return observability.getAppDataView('ux');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    dataView: data ?? undefined,
    loading,
  };
}
