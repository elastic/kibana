/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useDeleteInvestigationItem() {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  return useMutation<
    void,
    ServerError,
    { investigationId: string; itemId: string },
    { investigationId: string }
  >(
    ['deleteInvestigationItem'],
    ({ investigationId, itemId }) => {
      return http.delete<void>(
        `/api/observability/investigations/${investigationId}/items/${itemId}`,
        { version: '2023-10-31' }
      );
    },
    {
      onSuccess: (response, {}) => {
        toasts.addSuccess(
          i18n.translate('xpack.investigateApp.useDeleteInvestigationItem.successMessage', {
            defaultMessage: 'Item deleted',
          })
        );
      },
      onError: (error, {}, context) => {
        toasts.addError(
          new Error(
            error.body?.message ??
              i18n.translate('xpack.investigateApp.useDeleteInvestigationItem.errorMessage', {
                defaultMessage: 'an error occurred',
              })
          ),
          {
            title: i18n.translate('xpack.investigateApp.useDeleteInvestigationItem.errorTitle', {
              defaultMessage: 'Error',
            }),
          }
        );
      },
    }
  );
}
