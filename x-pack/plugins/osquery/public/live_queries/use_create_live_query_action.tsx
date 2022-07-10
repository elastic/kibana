/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  return useMutation(
    (payload: CreateLiveQueryRequestBodySchema) =>
      http.post<any>('/api/osquery/live_queries', {
        body: JSON.stringify({ ...payload, execution_context: queryExecutionContext }),
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
