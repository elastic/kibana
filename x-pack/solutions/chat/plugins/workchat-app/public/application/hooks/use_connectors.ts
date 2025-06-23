/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { ListConnectorsResponse } from '../../../common/http_api/connectors';
import { queryKeys } from '../query_keys';
import { useKibana } from './use_kibana';

export const useConnectors = () => {
  const {
    services: { http },
  } = useKibana();

  const { data: connectors, isLoading } = useQuery({
    queryKey: queryKeys.connectors.list,
    queryFn: async () => {
      const response = await http.get<ListConnectorsResponse>('/internal/workchat/connectors');
      return response.connectors;
    },
    initialData: () => [],
  });

  return {
    connectors,
    isLoading,
  };
};
