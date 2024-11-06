/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import type { IClusterClient, LoggerFactory, Logger } from '@kbn/core/server';
import { RuleMigrationsDataStream } from './data_stream/rule_migrations_data_stream';
import type {
  SiemRulesMigrationsSetupParams,
  SiemRuleMigrationsCreateClientParams,
  SiemRuleMigrationsClient,
} from './types';
import { RuleMigrationsTaskService } from './task/rule_migrations_task_service';

export class SiemRuleMigrationsService {
  private rulesDataStream: RuleMigrationsDataStream;
  private esClusterClient?: IClusterClient;
  private taskRunner: RuleMigrationsTaskService;
  private logger: Logger;

  constructor(logger: LoggerFactory, kibanaVersion: string) {
    this.logger = logger.get('siemRuleMigrations');
    this.rulesDataStream = new RuleMigrationsDataStream(this.logger, kibanaVersion);
    this.taskRunner = new RuleMigrationsTaskService(this.logger);
  }

  setup({ esClusterClient, ...params }: SiemRulesMigrationsSetupParams) {
    this.esClusterClient = esClusterClient;
    const esClient = esClusterClient.asInternalUser;

    this.rulesDataStream.install({ ...params, esClient });
  }

  createClient({
    spaceId,
    currentUser,
    request,
  }: SiemRuleMigrationsCreateClientParams): SiemRuleMigrationsClient {
    assert(currentUser, 'Current user must be authenticated');
    assert(this.esClusterClient, 'ES client not available, please call setup first');

    // TODO: change to `esClient = this.esClusterClient.asScoped(request).asCurrentUser;` when the API is made public
    const esClient = this.esClusterClient.asInternalUser;

    const dataClient = this.rulesDataStream.createClient({ spaceId, currentUser, esClient });
    const taskClient = this.taskRunner.createClient({ currentUser, dataClient });

    return { data: dataClient, task: taskClient };
  }

  stop() {
    this.taskRunner.stopAll();
  }
}
