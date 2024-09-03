/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClientOptions } from '@kbn/test';
import { KbnClient } from '@kbn/test';
import pRetry from 'p-retry';
import type { ReqOptions } from '@kbn/test/src/kbn_client/kbn_client_requester';
import { type AxiosResponse } from 'axios';
import type { ClientOptions } from '@elastic/elasticsearch/lib/client';
import fs from 'fs';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { omit } from 'lodash';
import {
  fetchKibanaStatus,
  isServerlessKibanaFlavor,
} from '../../../common/endpoint/utils/kibana_status';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { isLocalhost } from './is_localhost';
import { getLocalhostRealIp } from './network_services';
import { createSecuritySuperuser } from './security_user_services';

const CA_CERTIFICATE: Buffer = fs.readFileSync(CA_CERT_PATH);

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
  /** If true, then a certificate will not be used when creating the Kbn/Es clients when url is `https` */
  useCertForSsl?: boolean;
}

class KbnClientExtended extends KbnClient {
  private readonly apiKey: string | undefined;

  constructor(protected readonly options: KbnClientOptions & { apiKey?: string }) {
    const { apiKey, url, ...opt } = options;

    super({
      ...opt,
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
      this.options.log.verbose(`Adding API key header to request header 'Authorization'`);
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
  esUsername: _esUsername,
  esPassword: _esPassword,
  log = createToolingLogger(),
  asSuperuser = false,
  useCertForSsl = false,
}: CreateRuntimeServicesOptions): Promise<RuntimeServices> => {
  let username = _username;
  let password = _password;
  let esUsername = _esUsername;
  let esPassword = _esPassword;

  if (asSuperuser) {
    const tmpKbnClient = createKbnClient({
      url: kibanaUrl,
      username,
      password,
      useCertForSsl,
      log,
    });

    await waitForKibana(tmpKbnClient);
    const isServerlessEs = await isServerlessKibanaFlavor(tmpKbnClient);

    if (isServerlessEs) {
      log?.warning(
        'Creating Security Superuser is not supported in current environment.\nES is running in serverless mode. ' +
          'Will use username [system_indices_superuser] instead.'
      );

      username = 'system_indices_superuser';
      password = 'changeme';

      esUsername = 'system_indices_superuser';
      esPassword = 'changeme';
    } else {
      const superuserResponse = await createSecuritySuperuser(
        createEsClient({
          url: elasticsearchUrl,
          username: esUsername ?? username,
          password: esPassword ?? password,
          log,
          useCertForSsl,
        })
      );

      ({ username, password } = superuserResponse);

      if (superuserResponse.created) {
        log.info(`Kibana user [${username}] was crated with password [${password}]`);
      }
    }
  }

  const kbnURL = new URL(kibanaUrl);
  const esURL = new URL(elasticsearchUrl);
  const fleetURL = new URL(fleetServerUrl);

  return {
    kbnClient: createKbnClient({ log, url: kibanaUrl, username, password, apiKey, useCertForSsl }),
    esClient: createEsClient({
      log,
      url: elasticsearchUrl,
      username: esUsername ?? username,
      password: esPassword ?? password,
      apiKey,
      useCertForSsl,
    }),
    log,
    localhostRealIp: getLocalhostRealIp(),
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
  useCertForSsl = false,
}: {
  url: string;
  username: string;
  password: string;
  /** If defined, both `username` and `password` will be ignored */
  apiKey?: string;
  log?: ToolingLog;
  useCertForSsl?: boolean;
}): Client => {
  const isHttps = new URL(url).protocol.startsWith('https');
  const clientOptions: ClientOptions = {
    node: buildUrlWithCredentials(url, apiKey ? '' : username, apiKey ? '' : password),
  };

  if (isHttps && useCertForSsl) {
    clientOptions.tls = {
      ca: [CA_CERTIFICATE],
    };
  }

  if (apiKey) {
    clientOptions.auth = { apiKey };
  }

  if (log) {
    log.verbose(
      `Creating Elasticsearch client options: ${JSON.stringify({
        ...omit(clientOptions, 'tls'),
        ...(clientOptions.tls ? { tls: { ca: [typeof clientOptions.tls.ca] } } : {}),
      })}`
    );
  }

  return new Client(clientOptions);
};

export const createKbnClient = ({
  url,
  username,
  password,
  apiKey,
  log = createToolingLogger(),
  useCertForSsl = false,
}: {
  url: string;
  username: string;
  password: string;
  /** If defined, both `username` and `password` will be ignored */
  apiKey?: string;
  log?: ToolingLog;
  useCertForSsl?: boolean;
}): KbnClient => {
  const isHttps = new URL(url).protocol.startsWith('https');
  const clientOptions: ConstructorParameters<typeof KbnClientExtended>[0] = {
    log,
    apiKey,
    url: buildUrlWithCredentials(url, username, password),
  };

  if (isHttps && useCertForSsl) {
    clientOptions.certificateAuthorities = [CA_CERTIFICATE];
  }

  if (log) {
    log.verbose(
      `Creating Kibana client with URL: ${clientOptions.url} ${
        apiKey ? ` + ApiKey: ${apiKey}` : ''
      }`
    );
  }

  return new KbnClientExtended(clientOptions);
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

/**
 * Checks to ensure Kibana is up and running
 * @param kbnClient
 */
export const waitForKibana = async (kbnClient: KbnClient): Promise<void> => {
  await pRetry(
    async () => {
      const response = await fetchKibanaStatus(kbnClient);

      if (response.status.overall.level !== 'available') {
        throw new Error(
          `Kibana not available. [status.overall.level: ${response.status.overall.level}]`
        );
      }
    },
    { maxTimeout: 10000 }
  );
};
