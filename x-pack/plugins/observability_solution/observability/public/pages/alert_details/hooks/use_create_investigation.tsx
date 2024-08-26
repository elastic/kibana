/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  CreateInvestigationParams,
  CreateInvestigationResponse,
  FindInvestigationsResponse,
} from '@kbn/investigation-shared';
import { QueryKey, useMutation } from '@tanstack/react-query';
import { useKibana } from '../../../utils/kibana_react';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useCreateInvestigation() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useMutation<
    CreateInvestigationResponse,
    ServerError,
    { investigation: CreateInvestigationParams },
    { previousData?: FindInvestigationsResponse; queryKey?: QueryKey }
  >(
    ['createInvestigation'],
    ({ investigation }) => {
      const body = JSON.stringify(investigation);
      return http.post<CreateInvestigationResponse>(`/api/observability/investigations`, { body });
    },
    {
      onError: (error, { investigation }, context) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.observability.create.errorNotification', {
            defaultMessage: 'Something went wrong while creating investigation',
          }),
        });
      },
    }
  );
}
