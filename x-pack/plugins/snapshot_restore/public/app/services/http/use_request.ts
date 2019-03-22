/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState } from 'react';
import { API_BASE_PATH } from '../../../../common/constants';
import { useAppDependencies } from '../../index';

export const useRequest = ({
  path,
  method,
  body,
  interval,
}: {
  path: string;
  method: string;
  body?: any;
  interval?: number;
}) => {
  const {
    core: { http, chrome },
  } = useAppDependencies();

  const [error, setError] = useState<null | any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>([]);

  const request = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await http
        .getClient()
        [method](chrome.addBasePath(`${API_BASE_PATH}${path}`), body);
      if (!response.data) {
        throw new Error(response.statusText);
      }
      setData(response.data);
    } catch (e) {
      setError(e);
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
