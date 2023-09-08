/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { KbnClient } from '@kbn/test';
import type { StatusResponse } from '@kbn/core-status-common-internal';
import pRetry from 'p-retry';
import nodeFetch from 'node-fetch';
import { catchAxiosErrorFormatAndThrow } from './format_axios_error';
import { isLocalhost } from './is_localhost';
import { getLocalhostRealIp } from './localhost_services';
import { createSecuritySuperuser } from './security_user_services';

export interface RuntimeServices {
  kbnClient: KbnClient;
  esClient: Client;
  log: ToolingLog;
  user: Readonly<{
    username: string;
    password: string;
  }>;
  localhostRealIp: string;
  kibana: {
    url: string;
    hostname: string;
    port: string;
    isLocalhost: boolean;
  };
  elastic: {
    url: string;
    hostname: string;
    port: string;
    isLocalhost: boolean;
  };
  fleetServer: {
    url: string;
    hostname: string;
    port: string;
    isLocalhost: boolean;
  };
}

interface CreateRuntimeServicesOptions {
  kibanaUrl: string;
  elasticsearchUrl: string;
  fleetServerUrl?: string;
  username: string;
  password: string;
  /** If undefined, ES username defaults to `username` */
  esUsername?: string;
  /** If undefined, ES password defaults to `password` */
  esPassword?: string;
  log?: ToolingLog;
  asSuperuser?: boolean;
}

export const createRuntimeServices = async ({
  kibanaUrl,
  elasticsearchUrl,
  fleetServerUrl = 'https://localhost:8220',
  username: _username,
  password: _password,
  esUsername,
  esPassword,
  log = new ToolingLog({ level: 'info', writeTo: process.stdout }),
  asSuperuser = false,
}: CreateRuntimeServicesOptions): Promise<RuntimeServices> => {
  let username = _username;
  let password = _password;

  if (asSuperuser) {
    await waitForKibana(kibanaUrl);

    const superuserResponse = await createSecuritySuperuser(
      createEsClient({
        url: elasticsearchUrl,
        username,
        password,
        log,
      })
    );

    ({ username, password } = superuserResponse);

    if (superuserResponse.created) {
      log.info(`Kibana user [${username}] was crated with password [${password}]`);
    }
  }

  const kbnURL = new URL(kibanaUrl);
  const esURL = new URL(elasticsearchUrl);
  const fleetURL = new URL(fleetServerUrl);

  return {
    kbnClient: createKbnClient({ log, url: kibanaUrl, username, password }),
    esClient: createEsClient({
      log,
      url: elasticsearchUrl,
      username: esUsername ?? username,
      password: esPassword ?? password,
    }),
    log,
    localhostRealIp: await getLocalhostRealIp(),
    user: {
      username,
      password,
    },
    kibana: {
      url: kibanaUrl,
      hostname: kbnURL.hostname,
      port: kbnURL.port,
      isLocalhost: isLocalhost(kbnURL.hostname),
    },
    fleetServer: {
      url: fleetServerUrl,
      hostname: fleetURL.hostname,
      port: fleetURL.port,
      isLocalhost: isLocalhost(fleetURL.hostname),
    },
    elastic: {
      url: elasticsearchUrl,
      hostname: esURL.hostname,
      port: esURL.port,
      isLocalhost: isLocalhost(esURL.hostname),
    },
  };
};

export const buildUrlWithCredentials = (
  url: string,
  username: string,
  password: string
): string => {
  const newUrl = new URL(url);

  newUrl.username = username;
  newUrl.password = password;

  return newUrl.href;
};

export const createEsClient = ({
  url,
  username,
  password,
  log,
}: {
  url: string;
  username: string;
  password: string;
  log?: ToolingLog;
}): Client => {
  const esUrl = buildUrlWithCredentials(url, username, password);

  if (log) {
    log.verbose(`Creating Elasticsearch client with URL: ${esUrl}`);
  }

  return new Client({ node: esUrl });
};

export const createKbnClient = ({
  url,
  username,
  password,
  log = new ToolingLog(),
}: {
  url: string;
  username: string;
  password: string;
  log?: ToolingLog;
}): KbnClient => {
  const kbnUrl = buildUrlWithCredentials(url, username, password);

  if (log) {
    log.verbose(`Creating Kibana client with URL: ${kbnUrl}`);
  }

  return new KbnClient({ log, url: kbnUrl });
};

/**
 * Retrieves the Stack (kibana/ES) version from the `/api/status` kibana api
 * @param kbnClient
 */
export const fetchStackVersion = async (kbnClient: KbnClient): Promise<string> => {
  const status = (
    await kbnClient
      .request<StatusResponse>({
        method: 'GET',
        path: '/api/status',
      })
      .catch(catchAxiosErrorFormatAndThrow)
  ).data;

  if (!status?.version?.number) {
    throw new Error(
      `unable to get stack version from '/api/status' \n${JSON.stringify(status, null, 2)}`
    );
  }

  return status.version.number;
};

/**
 * Checks to ensure Kibana is up and running
 * @param kbnUrl
 */
export const waitForKibana = async (kbnUrl: string): Promise<void> => {
  const url = (() => {
    const u = new URL(kbnUrl);
    // This API seems to be available even if user is not authenticated
    u.pathname = '/api/status';
    return u.toString();
  })();

  await pRetry(
    async () => {
      const response = await nodeFetch(url);

      if (response.status !== 200) {
        throw new Error(
          `Kibana not available. Returned: [${response.status}]: ${response.statusText}`
        );
      }
    },
    { maxTimeout: 10000 }
  );
};
