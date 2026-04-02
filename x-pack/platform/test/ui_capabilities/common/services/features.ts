/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import util from 'util';
import type { ToolingLog } from '@kbn/tooling-log';
import type { FtrProviderContext } from '../ftr_provider_context';
import type { Features } from '../features';

export class FeaturesService {
  private readonly baseURL: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(url: string, private readonly log: ToolingLog) {
    this.baseURL = url;
    this.defaultHeaders = { 'kbn-xsrf': 'x-pack/ftr/services/features' };
  }

  public async get({ ignoreValidLicenses } = { ignoreValidLicenses: false }): Promise<Features> {
    this.log.debug('requesting /api/features to get the features');
    const response = await fetch(
      `${this.baseURL}/api/features?ignoreValidLicenses=${ignoreValidLicenses}`,
      {
        headers: this.defaultHeaders,
      }
    );

    const data = await response.json();

    if (response.status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${response.status} ${
          response.statusText
        }: ${util.inspect(data)}`
      );
    }

    const features = data.reduce(
      (acc: Features, feature: any) => ({
        ...acc,
        [feature.id]: {
          app: feature.app,
        },
      }),
      {}
    );
    return features;
  }
}

export function FeaturesProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));

  return new FeaturesService(url, log);
}
