/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import util from 'util';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrProviderContext } from '../ftr_provider_context';
import { Features } from '../features';

export class FeaturesService {
  constructor(
    private readonly url: string,
    private readonly credentials: { username: string; password: string },
    private readonly log: ToolingLog
  ) {}

  public async get({ ignoreValidLicenses } = { ignoreValidLicenses: false }): Promise<Features> {
    this.log.debug('requesting /api/features to get the features');
    const { username, password } = this.credentials;
    const response = await fetch(
      `${this.url}/api/features?ignoreValidLicenses=${ignoreValidLicenses}`,
      {
        headers: {
          'kbn-xsrf': 'x-pack/ftr/services/features',
          authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        },
        redirect: 'manual', // we'll handle our own statusCodes and throw informative errors
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${response.status} ${
          response.statusText
        }: ${util.inspect(await response.text())}`
      );
    }

    return ((await response.json()) as Array<{ id: string; app: string[] }>).reduce<Features>(
      (acc, feature) => ({
        ...acc,
        [feature.id]: { app: feature.app },
      }),
      {}
    );
  }
}

export function FeaturesProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  // `fetch` rejects URLs that embed credentials, so keep them out of the URL
  // and send them as a Basic auth header instead.
  const { username, password } = config.get('servers.kibana');
  const url = formatUrl({ ...config.get('servers.kibana'), auth: undefined });

  return new FeaturesService(url, { username, password }, log);
}
