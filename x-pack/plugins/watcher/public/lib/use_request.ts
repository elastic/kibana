/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { getHttpClient } from './api';

interface SendRequest {
  path?: string;
  method: string;
  body?: any;
}

interface SendRequestResponse {
  data: any;
  error: Error;
}

export const sendRequest = async ({
  path,
  method,
  body,
}: SendRequest): Promise<Partial<SendRequestResponse>> => {
  try {
    const response = await (getHttpClient() as any)[method](path, body);

    if (typeof response.data === 'undefined') {
      throw new Error(response.statusText);
    }

    return {
      data: response.data,
    };
  } catch (e) {
    return {
      error: e.response ? e.response : e,
    };
  }
};

interface UseRequest extends SendRequest {
  interval?: number;
  initialData?: any;
  processData?: any;
}

export const useRequest = ({
  path,
  method,
  body,
  interval,
  initialData,
  processData,
}: UseRequest) => {
  const [error, setError] = useState<null | any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>(initialData);

  // Tied to every render and bound to each request.
  let isOutdatedRequest = false;

  const createRequest = async () => {
    // Set a neutral state for a non-request.
    if (!path) {
      setError(null);
      setData(initialData);
      setIsLoading(false);
      return;
    }

    setError(null);
    setData(initialData);
    setIsLoading(true);

    const { data: responseData, error: responseError } = await sendRequest({
      path,
      method,
      body,
    });

    // Don't update state if an outdated request has resolved.
    if (isOutdatedRequest) {
      return;
    }

    setError(responseError);
    setData(processData && responseData ? processData(responseData) : responseData);
    setIsLoading(false);
  };

  useEffect(
    () => {
      function cancelOutdatedRequest() {
        isOutdatedRequest = true;
      }

      createRequest();

      if (interval) {
        const intervalRequest = setInterval(createRequest, interval);
        return () => {
          cancelOutdatedRequest();
          clearInterval(intervalRequest);
        };
      }

      // Called when a new render will trigger this effect.
      return cancelOutdatedRequest;
    },
    [path]
  );

  return {
    error,
    isLoading,
    data,
    createRequest,
  };
};
