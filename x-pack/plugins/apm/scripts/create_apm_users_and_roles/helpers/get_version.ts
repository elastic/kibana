/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Elasticsearch, Kibana } from '../create_apm_users_and_roles';
import { AbortError } from './call_kibana';
import { callKibana, isAxiosError } from './call_kibana';

export async function getKibanaVersion({
  elasticsearch,
  kibana,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
}) {
  try {
    const res: { version: { number: number } } = await callKibana({
      elasticsearch,
      kibana,
      options: {
        method: 'GET',
        url: `/api/status`,
      },
    });
    return res.version.number;
  } catch (e) {
    if (isAxiosError(e)) {
      switch (e.response?.status) {
        case 401:
          throw new AbortError(
            `Could not access Kibana with the provided credentials. Username: "${e.config.auth?.username}". Password: "${e.config.auth?.password}"`
          );

        case 404:
          throw new AbortError(
            `Could not get version on ${e.config.url} (Code: 404)`
          );

        default:
          throw new AbortError(
            `Cannot access Kibana on ${e.config.baseURL}. Please specify Kibana with: "--kibana-url <url>"`
          );
      }
    }
    throw e;
  }
}
