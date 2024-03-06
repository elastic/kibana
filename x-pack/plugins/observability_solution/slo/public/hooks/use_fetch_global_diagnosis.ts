/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import type { PublicLicenseJSON } from '@kbn/licensing-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../utils/kibana_react';
import { convertErrorForUseInToast } from './helpers/convert_error_for_use_in_toast';
import { sloKeys } from './query_key_factory';

interface SloGlobalDiagnosisResponse {
  licenseAndFeatures: PublicLicenseJSON;
  userPrivileges: { write: SecurityHasPrivilegesResponse; read: SecurityHasPrivilegesResponse };
}

export interface UseFetchSloGlobalDiagnoseResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: SloGlobalDiagnosisResponse | undefined;
}

export function useFetchSloGlobalDiagnosis(): UseFetchSloGlobalDiagnoseResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: sloKeys.globalDiagnosis(),
    queryFn: async ({ signal }) => {
      try {
        const response = await http.get<SloGlobalDiagnosisResponse>(
          '/internal/observability/slos/_diagnosis',
          {
            query: {},
            signal,
          }
        );

        return response;
      } catch (error) {
        throw convertErrorForUseInToast(error);
      }
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    retry: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.slo.globalDiagnosis.errorNotification', {
          defaultMessage: 'You do not have the right permissions to use this feature.',
        }),
      });
    },
  });

  return {
    data,
    isLoading,
    isInitialLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
