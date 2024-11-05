/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchUiConfig as triggersActionsUiConfig } from '@kbn/response-ops-rule-form';
import { useKibana } from '../../common/lib/kibana';

export const useLoadConfigQuery = () => {
  const { http } = useKibana().services;
  const { data } = useQuery({
    queryKey: ['loadConfig'],
    queryFn: () => {
      return triggersActionsUiConfig({ http });
    },
    initialData: { isUsingSecurity: false },
    refetchOnWindowFocus: false,
  });

  return {
    config: data,
  };
};
