/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { REACT_QUERY_KEYS } from '../constants';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useCreateKnowledgeBaseEntry() {
  const {
    observabilityAIAssistant,
    notifications: { toasts },
  } = useKibana().services;

  const queryClient = useQueryClient();
  const observabilityAIAssistantApi = observabilityAIAssistant?.service.callApi;

  return useMutation<
    void,
    ServerError,
    {
      entry: Omit<
        KnowledgeBaseEntry,
        '@timestamp' | 'confidence' | 'is_correction' | 'role' | 'doc_id'
      >;
    }
  >(
    [REACT_QUERY_KEYS.CREATE_KB_ENTRIES],
    ({ entry }) => {
      if (!observabilityAIAssistantApi) {
        return Promise.reject('Error with observabilityAIAssistantApi: API not found.');
      }

      return observabilityAIAssistantApi?.(
        'POST /internal/observability_ai_assistant/kb/entries/save',
        {
          signal: null,
          params: {
            body: {
              ...entry,
              role: 'user_entry',
            },
          },
        }
      );
    },
    {
      onSuccess: (_data, { entry }) => {
        toasts.addSuccess(
          i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.addManualEntry.successNotification',
            {
              defaultMessage: 'Successfully created {name}',
              values: { name: entry.id },
            }
          )
        );

        queryClient.invalidateQueries({
          queryKey: [REACT_QUERY_KEYS.GET_KB_ENTRIES],
          refetchType: 'all',
        });
      },
      onError: (error, { entry }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.addManualEntry.errorNotification',
            {
              defaultMessage: 'Something went wrong while creating {name}',
              values: { name: entry.id },
            }
          ),
        });
      },
    }
  );
}
