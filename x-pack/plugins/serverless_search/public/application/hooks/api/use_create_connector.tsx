/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect } from 'react';
import { generatePath } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Connector } from '@kbn/search-connectors';
import { EDIT_CONNECTOR_PATH } from '../../components/connectors_router';
import { useKibanaServices } from '../use_kibana';

export const useCreateConnector = () => {
  const {
    application: { navigateToUrl },
    http,
  } = useKibanaServices();
  const {
    data: connector,
    isLoading,
    isSuccess,
    mutate,
  } = useMutation({
    mutationFn: async () => {
      const result = await http.post<{ connector: Connector }>(
        '/internal/serverless_search/connectors'
      );
      return result.connector;
    },
  });

  useEffect(() => {
    if (isSuccess) {
      navigateToUrl(generatePath(EDIT_CONNECTOR_PATH, { id: connector?.id || '' }));
    }
  }, [connector, isSuccess, navigateToUrl]);

  const createConnector = () => mutate();
  return { createConnector, isLoading };
};
