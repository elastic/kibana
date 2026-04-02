/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Elasticsearch, Kibana } from '../create_apm_users';
import { AbortError, callKibana, isKibanaError } from './call_kibana';

export async function getKibanaVersion({
  elasticsearch,
  kibana,
}: {
  elasticsearch: Omit<Elasticsearch, 'node'>;
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
    if (isKibanaError(e)) {
      switch (e.status) {
        case 401:
          throw new AbortError(
            `Could not access Kibana with the provided credentials. Username: "${elasticsearch.username}". Password: "${elasticsearch.password}"`
          );

        case 404:
          throw new AbortError(`Could not get version on ${kibana.hostname} (Code: 404)`);

        default:
          throw new AbortError(
            `Cannot access Kibana on ${kibana.hostname}. Please specify Kibana with: "--kibana-url <url>"`
          );
      }
    }
    throw e;
  }
}
