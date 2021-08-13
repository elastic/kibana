/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { once } from 'lodash';
import { Elasticsearch } from './create_kibana_user_role';

export async function callKibana<T>({
  elasticsearch,
  kibanaHostname,
  options,
}: {
  elasticsearch: Elasticsearch;
  kibanaHostname: string;
  options: AxiosRequestConfig;
}): Promise<T> {
  const kibanaBasePath = await getKibanaBasePath({ kibanaHostname });
  const { username, password } = elasticsearch;

  const { data } = await axios.request({
    ...options,
    baseURL: kibanaHostname + kibanaBasePath,
    auth: { username, password },
    headers: { 'kbn-xsrf': 'true', ...options.headers },
  });
  return data;
}

const getKibanaBasePath = once(
  async ({ kibanaHostname }: { kibanaHostname: string }) => {
    try {
      await axios.request({ url: kibanaHostname, maxRedirects: 0 });
    } catch (e) {
      if (isAxiosError(e)) {
        const location = e.response?.headers?.location;
        const isBasePath = RegExp(/^\/\w{3}$/).test(location);
        return isBasePath ? location : '';
      }

      throw e;
    }
    return '';
  }
);

export function isAxiosError(e: AxiosError | Error): e is AxiosError {
  return 'isAxiosError' in e;
}
