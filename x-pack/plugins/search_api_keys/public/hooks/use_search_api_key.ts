/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { APIKeyCreationResponse, APIRoutes } from '../../common/types';

const API_KEY_STORAGE_KEY = 'searchApiKey';
export enum Status {
  loading = 'loading',
  showCreateButton = 'showCreateButton',
  showHiddenKey = 'showHiddenKey',
  showPreviewKey = 'showPreviewKey',
}

export const useSearchApiKey = () => {
  const { http } = useKibana().services;
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(Status.loading);
  const handleSaveKey = useCallback(({ id, encoded }: { id: string; encoded: string }) => {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify({ id, encoded }));
    setApiKey(encoded);
    setStatus(Status.showPreviewKey);
  }, []);
  const { mutateAsync: validateApiKey } = useMutation(async (id: string) => {
    try {
      if (!http?.post) {
        throw new Error('HTTP service is unavailable');
      }

      const response = await http.post<{ isValid: boolean }>(APIRoutes.API_KEY_VALIDITY, {
        body: JSON.stringify({ id }),
      });

      return response.isValid;
    } catch (err) {
      return false;
    }
  });
  const { mutateAsync: createApiKey } = useMutation<APIKeyCreationResponse | undefined>({
    mutationFn: async () => {
      try {
        if (!http?.post) {
          throw new Error('HTTP service is unavailable');
        }

        return await http.post<APIKeyCreationResponse>(APIRoutes.API_KEYS);
      } catch (err) {
        if (err.response?.status === 400) {
          setStatus(Status.showCreateButton);
        } else {
          throw err;
        }
      }
    },
    onSuccess: (receivedApiKey) => {
      if (receivedApiKey) {
        sessionStorage.setItem(
          API_KEY_STORAGE_KEY,
          JSON.stringify({ id: receivedApiKey.id, encoded: receivedApiKey.encoded })
        );
        setApiKey(receivedApiKey.encoded);
        setStatus(Status.showHiddenKey);
      }
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const storedKey = sessionStorage.getItem(API_KEY_STORAGE_KEY);

        if (storedKey) {
          const { id, encoded } = JSON.parse(storedKey);

          if (await validateApiKey(id)) {
            setApiKey(encoded);
            setStatus(Status.showHiddenKey);
          } else {
            setApiKey(null);
            sessionStorage.removeItem(API_KEY_STORAGE_KEY);
          }
        } else {
          await createApiKey();
        }
      } catch (e) {
        throw e;
      }
    })();
  }, [validateApiKey, createApiKey]);

  return {
    apiKey,
    handleSaveKey,
    status,
  };
};
