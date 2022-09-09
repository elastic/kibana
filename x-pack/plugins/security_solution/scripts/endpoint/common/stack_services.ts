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
import { createSecuritySuperuser } from './security_user_services';

export interface RuntimeServices {
  kbnClient: KbnClient;
  esClient: Client;
  log: ToolingLog;
  user: Readonly<{
    username: string;
    password: string;
  }>;
}

interface CreateRuntimeServicesOptions {
  kibanaUrl: string;
  elasticsearchUrl: string;
  username: string;
  password: string;
  log?: ToolingLog;
  asSuperuser?: boolean;
}

export const createRuntimeServices = async ({
  kibanaUrl,
  elasticsearchUrl,
  username: _username,
  password: _password,
  log = new ToolingLog(),
  asSuperuser = false,
}: CreateRuntimeServicesOptions): Promise<RuntimeServices> => {
  let username = _username;
  let password = _password;

  if (asSuperuser) {
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

  return {
    kbnClient: createKbnClient({ log, url: kibanaUrl, username, password }),
    esClient: createEsClient({ log, url: elasticsearchUrl, username, password }),
    log,
    user: {
      username,
      password,
    },
  };
};

const buildUrlWithCredentials = (url: string, username: string, password: string): string => {
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
    await kbnClient.request<StatusResponse>({
      method: 'GET',
      path: '/api/status',
    })
  ).data;

  if (!status?.version?.number) {
    throw new Error(
      `unable to get stack version from '/api/status' \n${JSON.stringify(status, null, 2)}`
    );
  }

  return status.version.number;
};
