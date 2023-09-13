/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import type { KbnClientOptions } from '@kbn/test';
import { KbnClient } from '@kbn/test';
import type { StatusResponse } from '@kbn/core-status-common-internal';
import pRetry from 'p-retry';
import nodeFetch from 'node-fetch';
import type { ReqOptions } from '@kbn/test/src/kbn_client/kbn_client_requester';
import { type AxiosResponse } from 'axios';
import type { ClientOptions } from '@elastic/elasticsearch/lib/client';
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
  apiKey: string;
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
  /** If defined, both `username` and `password` will be ignored */
  apiKey?: string;
  /** If undefined, ES username defaults to `username` */
  esUsername?: string;
  /** If undefined, ES password defaults to `password` */
  esPassword?: string;
  log?: ToolingLog;
  asSuperuser?: boolean;
}

class KbnClientExtended extends KbnClient {
  private readonly apiKey: string | undefined;

  constructor({ apiKey, url, ...options }: KbnClientOptions & { apiKey?: string }) {
    super({
      ...options,
      url: apiKey ? buildUrlWithCredentials(url, '', '') : url,
    });

    this.apiKey = apiKey;
  }

  async request<T>(options: ReqOptions): Promise<AxiosResponse<T>> {
    const headers: ReqOptions['headers'] = {
      ...(options.headers ?? {}),
    };

    if (this.apiKey) {
      headers.Authorization = `ApiKey ${this.apiKey}`;
    }

    return super.request({
      ...options,
      headers,
    });
  }
}

export const createRuntimeServices = async ({
  kibanaUrl,
  elasticsearchUrl,
  fleetServerUrl = 'https://localhost:8220',
  username: _username,
  password: _password,
  apiKey,
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
    kbnClient: createKbnClient({ log, url: kibanaUrl, username, password, apiKey }),
    esClient: createEsClient({
      log,
      url: elasticsearchUrl,
      username: esUsername ?? username,
      password: esPassword ?? password,
      apiKey,
    }),
    log,
    localhostRealIp: await getLocalhostRealIp(),
    apiKey: apiKey ?? '',
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
  apiKey,
  log,
}: {
  url: string;
  username: string;
  password: string;
  /** If defined, both `username` and `password` will be ignored */
  apiKey?: string;
  log?: ToolingLog;
}): Client => {
  const clientOptions: ClientOptions = {
    node: buildUrlWithCredentials(url, apiKey ? '' : username, apiKey ? '' : password),
  };

  if (apiKey) {
    clientOptions.auth = { apiKey };
  }

  if (log) {
    log.verbose(`Creating Elasticsearch client options: ${JSON.stringify(clientOptions)}`);
  }

  return new Client(clientOptions);
};

export const createKbnClient = ({
  url,
  username,
  password,
  apiKey,
  log = new ToolingLog(),
}: {
  url: string;
  username: string;
  password: string;
  /** If defined, both `username` and `password` will be ignored */
  apiKey?: string;
  log?: ToolingLog;
}): KbnClient => {
  const kbnUrl = buildUrlWithCredentials(url, username, password);

  if (log) {
    log.verbose(
      `Creating Kibana client with URL: ${kbnUrl} ${apiKey ? ` + ApiKey: ${apiKey}` : ''}`
    );
  }

  return new KbnClientExtended({
    log,
    url: kbnUrl,
    apiKey,
    ...(kbnUrl.includes('https')
      ? { certificateAuthorities: [Fs.readFileSync(CA_CERT_PATH)] }
      : {}),
  });
};

/**
 * Retrieves the Stack (kibana/ES) version from the `/api/status` kibana api
 * @param kbnClient
 */
export const fetchStackVersion = async (kbnClient: KbnClient): Promise<string> => {
  const status = await fetchKibanaStatus(kbnClient);

  if (!status?.version?.number) {
    throw new Error(
      `unable to get stack version from '/api/status' \n${JSON.stringify(status, null, 2)}`
    );
  }

  return status.version.number;
};

export const fetchKibanaStatus = async (kbnClient: KbnClient): Promise<StatusResponse> => {
  return kbnClient
    .request<StatusResponse>({
      method: 'GET',
      path: '/api/status',
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data);
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
