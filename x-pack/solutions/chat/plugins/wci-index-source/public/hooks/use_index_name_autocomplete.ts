/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SearchIndicesResponse } from '../../common/http_api/configuration';

export const useIndexNameAutocomplete = () => {
  const {
    services: { http, notifications },
  } = useKibana<CoreStart>();

  const { isLoading, data } = useQuery({
    queryKey: ["index-name-autocomplete"],
    queryFn: () => async ({ indexName }: { indexName: string }) => {
      const response = await http.get<SearchIndicesResponse>(
        `/internal/wci-index-source/indices-autocomplete/${indexName}`
      );
      return response.indexNames;
    },
    onError: (err: any) => {
      notifications.toasts.addError(err, { title: 'Error fetching indices' });
    },
  });

  return {
    isLoading,
    data: data,
  };
};
