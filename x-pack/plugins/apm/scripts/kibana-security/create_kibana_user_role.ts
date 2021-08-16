/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callKibana, isAxiosError } from './call_kibana';
import { createAPMUsers } from './create_apm_users';

/* eslint-disable no-console */

export interface Elasticsearch {
  username: string;
  password: string;
}

export interface Kibana {
  roleSuffix: string;
  hostname: string;
}

export async function createKibanaUserRole({
  kibana,
  elasticsearch,
}: {
  kibana: Kibana;
  elasticsearch: Elasticsearch;
}) {
  const version = await getKibanaVersion({
    elasticsearch,
    kibanaHostname: kibana.hostname,
  });
  console.log(`Connected to Kibana ${version}`);

  const isSecurityEnabled = await getIsSecurityEnabled({
    elasticsearch,
    kibanaHostname: kibana.hostname,
  });
  if (!isSecurityEnabled) {
    throw new AbortError('Security must be enabled!');
  }

  await createAPMUsers({ kibana, elasticsearch });
}

async function getIsSecurityEnabled({
  elasticsearch,
  kibanaHostname,
}: {
  elasticsearch: Elasticsearch;
  kibanaHostname: string;
}) {
  try {
    await callKibana({
      elasticsearch,
      kibanaHostname,
      options: {
        url: `/internal/security/me`,
      },
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function getKibanaVersion({
  elasticsearch,
  kibanaHostname,
}: {
  elasticsearch: Elasticsearch;
  kibanaHostname: string;
}) {
  try {
    const res: { version: { number: number } } = await callKibana({
      elasticsearch,
      kibanaHostname,
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

export class AbortError extends Error {
  constructor(message: string) {
    super(message);
  }
}
