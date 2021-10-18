/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, CoreStart, ElasticsearchClient } from 'src/core/server';

import type { ESLicense, ESClusterInfo } from './types';

export class TelemetryReceiver {
  private readonly logger: Logger;
  private esClient?: ElasticsearchClient;

  constructor(logger: Logger) {
    this.logger = logger.get('telemetry_events');
  }

  public async start(core?: CoreStart) {
    this.esClient = core?.elasticsearch.client.asInternalUser;
  }

  public async fetchClusterInfo(): Promise<ESClusterInfo> {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve cluster infomation');
    }

    const { body } = await this.esClient.info();
    return body;
  }

  public async fetchLicenseInfo(): Promise<ESLicense | undefined> {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve license information');
    }

    try {
      const ret = (
        await this.esClient.transport.request({
          method: 'GET',
          path: '/_license',
          querystring: {
            local: true,
            // For versions >= 7.6 and < 8.0, this flag is needed otherwise 'platinum' is returned for 'enterprise' license.
            accept_enterprise: 'true',
          },
        })
      ).body as Promise<{ license: ESLicense }>;

      return (await ret).license;
    } catch (err) {
      this.logger.debug(`failed retrieving license: ${err}`);
      return undefined;
    }
  }

  public copyLicenseFields(lic: ESLicense) {
    return {
      uid: lic.uid,
      status: lic.status,
      type: lic.type,
      ...(lic.issued_to ? { issued_to: lic.issued_to } : {}),
      ...(lic.issuer ? { issuer: lic.issuer } : {}),
    };
  }
}
