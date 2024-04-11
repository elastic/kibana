/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { SloSettings } from '@kbn/slo-schema';

export const useGetSettings = () => {
  const { http } = useKibana().services;

  const { data: currentSettings } = useFetcher(() => {
    return http?.get<SloSettings>('/internal/slo/settings');
  }, [http]);
  return currentSettings ?? defaultSettings;
};

const defaultSettings = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: [],
};
