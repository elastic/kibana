/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../common/lib/kibana';
import { triggersActionsUiConfig } from '../../common/lib/config_api';

export const useLoadConfigQuery = () => {
  const { http } = useKibana().services;
  const { data } = useQuery({
    queryKey: ['loadConfig'],
    queryFn: () => {
      return triggersActionsUiConfig({ http });
    },
    initialData: { isUsingSecurity: false },
  });

  return {
    config: data,
  };
};
