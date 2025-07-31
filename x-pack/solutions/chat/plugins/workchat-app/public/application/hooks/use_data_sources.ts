/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from './use_kibana';
import { queryKeys } from '../query_keys';

export interface DataSourceUIConfig {
  componentPath?: string;
  componentProps?: Record<string, any>;
}

export interface DataSource {
  type: string;
  category: 'index_based' | 'federated';
  provider: string;
  name: string;
  description: string;
  iconPath?: string; // Path to the connector icon
  tags?: string[]; // List of tags for categorization and search
  uiConfig?: DataSourceUIConfig;
}

interface DataSourcesResponse {
  data_sources: DataSource[];
}

export const useDataSources = () => {
  const { services } = useKibana();
  const { http } = services;

  return useQuery({
    queryKey: queryKeys.dataSources.list,
    queryFn: async (): Promise<DataSource[]> => {
      console.log('useDataSources: Starting fetch from /internal/workchat_app/data_sources');

      try {
        const response = await http.get<DataSourcesResponse>('/internal/workchat_app/data_sources');
        console.log('useDataSources: API response received:', response);
        console.log('useDataSources: Number of data sources:', response.data_sources?.length || 0);

        if (response.data_sources && response.data_sources.length > 0) {
          response.data_sources.forEach((source, index) => {
            console.log(
              `useDataSources: ${index + 1}. ${source.name} (${source.type}) - ${
                source.category
              } via ${source.provider}`
            );
          });
        }

        return response.data_sources || [];
      } catch (error) {
        console.error('useDataSources: Error fetching data sources:', error);
        throw error;
      }
    },
  });
};

interface DataSourceUIConfigResponse {
  ui_config?: DataSourceUIConfig;
}

export const useDataSourceUIConfig = (type: string) => {
  const { services } = useKibana();
  const { http } = services;

  return useQuery({
    queryKey: queryKeys.dataSources.uiConfig(type),
    queryFn: async (): Promise<DataSourceUIConfig | undefined> => {
      console.log(`useDataSourceUIConfig: Fetching UI config for type: ${type}`);

      try {
        const response = await http.get<DataSourceUIConfigResponse>(
          `/internal/workchat_app/data_sources/${type}/ui_config`
        );
        console.log(`useDataSourceUIConfig: UI config response for ${type}:`, response);
        return response.ui_config;
      } catch (error) {
        console.error(`useDataSourceUIConfig: Error fetching UI config for ${type}:`, error);
        throw error;
      }
    },
    enabled: !!type,
  });
};
