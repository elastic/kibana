/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';
import { investigationKeys } from './query_key_factory';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useDeleteInvestigationNote() {
  const queryClient = useQueryClient();
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  return useMutation<
    void,
    ServerError,
    { investigationId: string; noteId: string },
    { investigationId: string }
  >(
    ['deleteInvestigationNote'],
    ({ investigationId, noteId }) => {
      return http.delete<void>(
        `/api/observability/investigations/${investigationId}/notes/${noteId}`,
        { version: '2023-10-31' }
      );
    },
    {
      onSuccess: (response, { investigationId }) => {
        queryClient.invalidateQueries({
          queryKey: investigationKeys.detailNotes(investigationId),
          exact: false,
        });

        toasts.addSuccess(
          i18n.translate('xpack.investigateApp.useDeleteInvestigationNote.successMessage', {
            defaultMessage: 'Note deleted',
          })
        );
      },
      onError: (error, {}, context) => {
        toasts.addError(
          new Error(
            error.body?.message ??
              i18n.translate('xpack.investigateApp.useDeleteInvestigationNote.errorMessage', {
                defaultMessage: 'an error occurred',
              })
          ),
          {
            title: i18n.translate('xpack.investigateApp.useDeleteInvestigationNote.errorTitle', {
              defaultMessage: 'Error',
            }),
          }
        );
      },
    }
  );
}
