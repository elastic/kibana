/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from 'react-query';
import { CreateActionRequestBodySchema } from '../../common/schemas/routes/action';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseLiveQueryActionProps {
  onSuccess?: () => void;
}

export const useLiveQueryAction = ({ onSuccess }: UseLiveQueryActionProps) => {
  const setErrorToast = useErrorToast();

  const { executionContext, http } = useKibana().services;
  const queryExecutionContext = executionContext?.get();

  return useMutation(
    (payload: CreateActionRequestBodySchema) =>
      http.post<any>('/internal/osquery/action', {
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
