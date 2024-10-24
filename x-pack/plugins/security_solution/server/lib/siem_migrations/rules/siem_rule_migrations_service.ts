/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient, Logger } from '@kbn/core/server';
import { RuleMigrationsDataStream } from './data_stream/rule_migrations_data_stream';
import type {
  SiemRuleMigrationsClient,
  SiemRulesMigrationsSetupParams,
  SiemRuleMigrationsGetClientParams,
} from './types';

export class SiemRuleMigrationsService {
  private dataStreamAdapter: RuleMigrationsDataStream;
  private esClusterClient?: IClusterClient;

  constructor(private logger: Logger, kibanaVersion: string) {
    this.dataStreamAdapter = new RuleMigrationsDataStream({ kibanaVersion });
  }

  setup({ esClusterClient, ...params }: SiemRulesMigrationsSetupParams) {
    this.esClusterClient = esClusterClient;
    const esClient = esClusterClient.asInternalUser;
    this.dataStreamAdapter.install({ ...params, esClient, logger: this.logger }).catch((err) => {
      this.logger.error(`Error installing data stream for rule migrations: ${err.message}`);
      throw err;
    });
  }

  getClient({ spaceId, request }: SiemRuleMigrationsGetClientParams): SiemRuleMigrationsClient {
    if (!this.esClusterClient) {
      throw new Error('ES client not available, please call setup first');
    }
    // Installs the data stream for the specific space. it will only install if it hasn't been installed yet.
    // The adapter stores the data stream name promise, it will return it directly when the data stream is known to be installed.
    const dataStreamNamePromise = this.dataStreamAdapter.installSpace(spaceId);

    const esClient = this.esClusterClient.asScoped(request).asCurrentUser;
    return {
      create: async (ruleMigrations) => {
        const _index = await dataStreamNamePromise;
        return esClient.bulk({
          refresh: 'wait_for',
          body: ruleMigrations.flatMap((ruleMigration) => [{ create: { _index } }, ruleMigration]),
        });
      },
      search: async (term) => {
        const index = await dataStreamNamePromise;
        return esClient.search({ index, body: { query: { term } } });
      },
    };
  }
}
