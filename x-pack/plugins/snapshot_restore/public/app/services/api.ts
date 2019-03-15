/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState } from 'react';
import { API_BASE_PATH } from '../../../common/constants';
import { AppStateInterface, useStateValue } from './app_context';

export const useFetch = ({
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
  const [
    {
      core: { http, chrome },
    },
  ] = useStateValue() as [AppStateInterface];

  const [error, setError] = useState<null | any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>([]);

  const fetch = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await http
        .getClient()
        [method](chrome.addBasePath(`${API_BASE_PATH}${path}`), body);
      if (response.data) {
        setData(response.data);
      } else {
        setError(new Error(response.statusText));
      }
    } catch (e) {
      setError(e);
    }
    setLoading(false);
  };

  useEffect(
    () => {
      fetch();
      if (interval) {
        const intervalFetch = setInterval(fetch, interval);
        return () => {
          clearInterval(intervalFetch);
        };
      }
    },
    [path]
  );

  return {
    error,
    loading,
    data,
    fetch,
  };
};
