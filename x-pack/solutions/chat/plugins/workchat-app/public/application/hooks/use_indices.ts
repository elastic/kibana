/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from './use_kibana';
import { queryKeys } from '../query_keys';

export interface Connector {
  id: string;
  name: string;
  service_type: string;
  status: string;
}

export interface Index {
  name: string;
  docCount: number;
  storeSize: string;
  health: string;
  status: string;
  capabilities: string[];
  connector: Connector | null;
}

interface IndicesResponse {
  indices: Index[];
}

export const useIndices = () => {
  const { services } = useKibana();
  const { http } = services;

  return useQuery({
    queryKey: queryKeys.dataSources.byId('indices'), // Reusing query keys structure
    queryFn: async (): Promise<Index[]> => {
      console.log('useIndices: Starting fetch from /internal/workchat_app/indices');

      try {
        const response = await http.get<IndicesResponse>('/internal/workchat_app/indices');
        console.log('useIndices: API response received:', response);
        console.log('useIndices: Number of indices:', response.indices?.length || 0);

        if (response.indices && response.indices.length > 0) {
          response.indices.forEach((index, i) => {
            const hasConnector = index.connector ? ` [Connected: ${index.connector.name}]` : '';
            console.log(
              `useIndices: ${i + 1}. ${index.name} - ${index.capabilities.join(', ')} (${
                index.docCount
              } docs)${hasConnector}`
            );
          });
        }

        return response.indices || [];
      } catch (error) {
        console.error('useIndices: Error fetching indices:', error);
        throw error;
      }
    },
    staleTime: 30000, // Cache for 30 seconds since indices don't change frequently
  });
};
