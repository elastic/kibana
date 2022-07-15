/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy, isEmpty } from 'lodash';
import { useMutation } from 'react-query';
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

  return useMutation<{ data: { action_id: string } }, Error, CreateLiveQueryRequestBodySchema>(
    // @ts-expect-error update types
    ({ agentSelection, ...payload }) =>
      http.post('/api/osquery/live_queries', {
        body: JSON.stringify(
          pickBy(
            {
              ...payload,
              agent_all: agentSelection.allAgentsSelected,
              agent_ids: agentSelection.agents,
              agent_platforms: agentSelection.platformsSelected,
              agent_policy_ids: agentSelection.policiesSelected,
              metadata: { execution_context: queryExecutionContext },
            },
            (value) => !isEmpty(value)
          )
        ),
      }),
    {
      onSuccess: () => {
        setErrorToast();
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error) => {
        setErrorToast(error);
      },
    }
  );
};
