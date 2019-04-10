/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useRef, useState } from 'react';
import { httpService } from './index';

interface SendRequest {
  path: string;
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
    const response = await httpService.httpClient[method](path, body);

    if (!response.data) {
      throw new Error(response.statusText);
    }

    return {
      data: response.data,
    };
  } catch (e) {
    return {
      error: e,
    };
  }
};

interface UseRequest extends SendRequest {
  interval?: number;
}

export const useRequest = ({ path, method, body, interval }: UseRequest) => {
  const [error, setError] = useState<null | any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>([]);
  const isMounted = useRef<boolean>(true);

  const request = async () => {
    setError(null);
    setLoading(true);
    const { data: responseData, error: responseError } = await sendRequest({
      path,
      method,
      body,
    });
    // Avoid setting state for components that unmounted before request completed
    if (!isMounted.current) {
      return;
    }
    // Set state for components that are still mounted
    if (responseError) {
      setError(responseError);
    } else {
      setData(responseData);
    }
    setLoading(false);
  };

  useEffect(
    () => {
      function cleanup() {
        isMounted.current = false;
      }

      request();

      if (interval) {
        const intervalRequest = setInterval(request, interval);
        return () => {
          cleanup();
          clearInterval(intervalRequest);
        };
      }

      return cleanup;
    },
    [path]
  );

  return {
    error,
    loading,
    data,
    request,
  };
};
