/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from 'react-query';

import { useKibana } from '../lib/kibana';
import { useErrorToast } from './use_error_toast';

export const useOsqueryIntegrationStatus = () => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    'integration',
    () =>
      http.get<{ name: string; version: string; title: string; install_status: string }>(
        '/internal/osquery/status'
      ),
    {
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.osquery_integration.fetchError', {
            defaultMessage: 'Error while fetching osquery integration',
          }),
        }),
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};
