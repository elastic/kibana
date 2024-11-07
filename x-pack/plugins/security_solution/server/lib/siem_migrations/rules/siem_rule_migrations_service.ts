/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import type { IClusterClient, Logger } from '@kbn/core/server';
import { RuleMigrationsDataStream } from './data_stream/rule_migrations_data_stream';
import type {
  SiemRulesMigrationsSetupParams,
  SiemRuleMigrationsCreateClientParams,
  SiemRuleMigrationsClient,
} from './types';
import { RuleMigrationsTaskRunner } from './task/rule_migrations_task_runner';

export class SiemRuleMigrationsService {
  private rulesDataStream: RuleMigrationsDataStream;
  private esClusterClient?: IClusterClient;
  private taskRunner: RuleMigrationsTaskRunner;

  constructor(private logger: Logger, kibanaVersion: string) {
    this.rulesDataStream = new RuleMigrationsDataStream(this.logger, kibanaVersion);
    this.taskRunner = new RuleMigrationsTaskRunner(this.logger);
  }

  setup({ esClusterClient, ...params }: SiemRulesMigrationsSetupParams) {
    this.esClusterClient = esClusterClient;
    const esClient = esClusterClient.asInternalUser;

    this.rulesDataStream.install({ ...params, esClient }).catch((err) => {
      this.logger.error(`Error installing data stream for rule migrations: ${err.message}`);
      throw err;
    });
  }

  createClient({
    spaceId,
    currentUser,
    request,
  }: SiemRuleMigrationsCreateClientParams): SiemRuleMigrationsClient {
    assert(currentUser, 'Current user must be authenticated');
    assert(this.esClusterClient, 'ES client not available, please call setup first');

    const esClient = this.esClusterClient.asScoped(request).asCurrentUser;
    const dataClient = this.rulesDataStream.createClient({ spaceId, currentUser, esClient });

    return {
      data: dataClient,
      task: {
        start: (params) => {
          return this.taskRunner.start({ ...params, currentUser, dataClient });
        },
        stop: (migrationId) => {
          return this.taskRunner.stop({ migrationId, dataClient });
        },
        getStats: async (migrationId) => {
          return this.taskRunner.getStats({ migrationId, dataClient });
        },
        getAllStats: async () => {
          return this.taskRunner.getAllStats({ dataClient });
        },
      },
    };
  }

  stop() {
    this.taskRunner.stopAll();
  }
}
