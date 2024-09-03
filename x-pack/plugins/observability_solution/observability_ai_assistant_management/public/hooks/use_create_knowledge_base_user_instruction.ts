/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type Instruction } from '@kbn/observability-ai-assistant-plugin/common/types';
import { REACT_QUERY_KEYS } from '../constants';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useCreateKnowledgeBaseUserInstruction() {
  const {
    observabilityAIAssistant,
    notifications: { toasts },
  } = useKibana().services;

  const queryClient = useQueryClient();
  const observabilityAIAssistantApi = observabilityAIAssistant.service.callApi;

  return useMutation<void, ServerError, { entry: Instruction & { public: boolean } }>(
    [REACT_QUERY_KEYS.CREATE_KB_ENTRIES],
    ({ entry }) => {
      return observabilityAIAssistantApi(
        'PUT /internal/observability_ai_assistant/kb/user_instructions',
        {
          signal: null,
          params: {
            body: {
              id: entry.doc_id,
              text: entry.text,
              public: entry.public,
            },
          },
        }
      );
    },
    {
      onSuccess: (_data, { entry }) => {
        toasts.addSuccess(
          i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.addUserInstruction.successNotification',
            {
              defaultMessage: 'User instruction saved',
            }
          )
        );

        queryClient.invalidateQueries({
          queryKey: [REACT_QUERY_KEYS.GET_KB_USER_INSTRUCTIONS],
          refetchType: 'all',
        });
      },
      onError: (error, { entry }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.addUserInstruction.errorNotification',
            {
              defaultMessage: 'Something went wrong while creating {name}',
              values: { name: entry.doc_id },
            }
          ),
        });
      },
    }
  );
}
