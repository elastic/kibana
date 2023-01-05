/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { AgentSelection, LiveQueryDetailsItem } from '@kbn/osquery-io-ts-types';
import type { CreateLiveQueryRequestBodySchema } from '../../common/schemas/routes/live_query';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseLiveQueryProps {
  onSuccess?: () => void;
}

export const useCreateLiveQuery = ({ onSuccess }: UseLiveQueryProps) => {
  const setErrorToast = useErrorToast();

  const { executionContext, http } = useKibana().services;
  const queryExecutionContext = executionContext?.get();

  return useMutation<
    LiveQueryDetailsItem,
    { body: { error: string; message: string } },
    Omit<
      CreateLiveQueryRequestBodySchema,
      'agent_all' | 'agent_ids' | 'agent_platforms' | 'agent_policy_ids'
    > & {
      agentSelection: AgentSelection;
    }
  >(
    async ({ agentSelection, ...payload }) => {
      const response = await http.post<{ data: LiveQueryDetailsItem }>(
        '/api/osquery/live_queries',
        {
          body: JSON.stringify({
            ...payload,
            agent_all: agentSelection.allAgentsSelected,
            agent_ids: agentSelection.agents,
            agent_platforms: agentSelection.platformsSelected,
            agent_policy_ids: agentSelection.policiesSelected,
            metadata: { execution_context: queryExecutionContext },
          }),
        }
      );

      return response?.data;
    },
    {
      onSuccess: () => {
        setErrorToast();
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error) => {
        setErrorToast(error, {
          title: error.body.error,
          toastMessage: error.body.message,
        });
      },
    }
  );
};
