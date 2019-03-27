/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState } from 'react';

interface SendRequest {
  path: string;
  method: string;
  body?: any;
  httpClient: any;
}

interface SendRequestResponse {
  data: any;
  error: Error;
}

export const sendRequest = async ({
  path,
  method,
  body,
  httpClient,
}: SendRequest): Promise<Partial<SendRequestResponse>> => {
  try {
    const response = await httpClient[method](path, body);

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

export const useRequest = ({ path, method, body, httpClient, interval }: UseRequest) => {
  const [error, setError] = useState<null | any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>([]);

  const request = async () => {
    setError(null);
    setLoading(true);
    const { data: responseData, error: responseError } = await sendRequest({
      path,
      method,
      body,
      httpClient,
    });
    if (responseError) {
      setError(responseError);
    } else {
      setData(responseData);
    }
    setLoading(false);
  };

  useEffect(
    () => {
      request();
      if (interval) {
        const intervalRequest = setInterval(request, interval);
        return () => {
          clearInterval(intervalRequest);
        };
      }
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
