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
  private dataStreamName?: string;

  constructor(private logger: Logger, kibanaVersion: string) {
    this.dataStreamAdapter = new RuleMigrationsDataStream({ kibanaVersion });
  }

  async setup({ esClusterClient, ...params }: SiemRulesMigrationsSetupParams) {
    this.esClusterClient = esClusterClient;
    const esClient = esClusterClient.asInternalUser;
    await this.dataStreamAdapter.install({ ...params, esClient, logger: this.logger });
  }

  getClient({ spaceId, request }: SiemRuleMigrationsGetClientParams): SiemRuleMigrationsClient {
    if (!this.esClusterClient) {
      throw new Error('ES client not available, please call setup first');
    }
    const esClient = this.esClusterClient.asScoped(request).asCurrentUser;

    return {
      install: async () => {
        this.dataStreamName = await this.dataStreamAdapter.installSpace(spaceId);
      },
      index: async (body) => {
        if (!this.dataStreamName) {
          throw new Error('Install must be called before indexing');
        }
        return esClient.index({ index: this.dataStreamName, ...body });
      },
      find: async () => {
        // TODO: Implement
      },
    };
  }
}
