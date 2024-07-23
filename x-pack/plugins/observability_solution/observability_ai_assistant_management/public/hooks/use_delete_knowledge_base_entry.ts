/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { REACT_QUERY_KEYS } from '../constants';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useDeleteKnowledgeBaseEntry() {
  const {
    observabilityAIAssistant,
    notifications: { toasts },
  } = useKibana().services;

  const queryClient = useQueryClient();
  const observabilityAIAssistantApi = observabilityAIAssistant?.service.callApi;

  return useMutation<unknown, ServerError, { id: string }>(
    [REACT_QUERY_KEYS.CREATE_KB_ENTRIES],
    ({ id: entryId }) => {
      if (!observabilityAIAssistantApi) {
        return Promise.reject('Error with observabilityAIAssistantApi: API not found.');
      }

      return observabilityAIAssistantApi?.(
        'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
        {
          signal: null,
          params: {
            path: {
              entryId,
            },
          },
        }
      );
    },
    {
      onSuccess: (_data, { id }) => {
        toasts.addSuccess(
          i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.deleteManualEntry.successNotification',
            {
              defaultMessage: 'Successfully deleted {id}',
              values: { id },
            }
          )
        );

        queryClient.invalidateQueries({
          queryKey: [REACT_QUERY_KEYS.GET_KB_ENTRIES],
          refetchType: 'all',
        });
      },
      onError: (error, { id }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.deleteManualEntry.errorNotification',
            {
              defaultMessage: 'Something went wrong while deleting {name}',
              values: { name: id },
            }
          ),
        });
      },
    }
  );
}
