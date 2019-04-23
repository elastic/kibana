/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState } from 'react';
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
  initialData?: any;
  timeout?: number;
}

export const useRequest = ({ path, method, body, interval, initialData, timeout }: UseRequest) => {
  const [error, setError] = useState<null | any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(initialData);

  // Tied to every render and bound to each request.
  let isOutdatedRequest = false;

  const request = async () => {
    setError(null);
    setData(initialData);
    setLoading(true);

    const requestBody = {
      path,
      method,
      body,
    };

    let response;

    if (timeout) {
      [response] = await Promise.all([
        sendRequest(requestBody),
        new Promise(resolve => setTimeout(resolve, timeout)),
      ]);
    } else {
      response = await sendRequest(requestBody);
    }

    // Don't update state if an outdated request has resolved.
    if (isOutdatedRequest) {
      return;
    }

    setError(response.error);
    setData(response.data);
    setLoading(false);
  };

  useEffect(
    () => {
      function cancelOutdatedRequest() {
        isOutdatedRequest = true;
      }

      request();

      if (interval) {
        const intervalRequest = setInterval(request, interval);
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
    loading,
    data,
    request,
  };
};
