/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { KbnClient } from '@kbn/test';
import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { createRuntimeServices } from '../common/stack_services';

export class EmulatorRunContext {
  private esClient: Client | undefined = undefined;
  private kbnClient: KbnClient | undefined = undefined;
  private wasStarted: boolean = false;

  constructor(
    private readonly username: string,
    private readonly password: string,
    private readonly kibanaUrl: string,
    private readonly elasticUrl: string,

    private readonly asSuperuser: boolean = false,
    private log: ToolingLog | undefined = undefined
  ) {}

  async start() {
    if (this.wasStarted) {
      return;
    }

    const stackServices = await createRuntimeServices({
      kibanaUrl: this.kibanaUrl,
      elasticsearchUrl: this.elasticUrl,
      username: this.username,
      password: this.password,
      asSuperuser: this.asSuperuser,
      log: this.log,
    });

    this.esClient = stackServices.esClient;
    this.kbnClient = stackServices.kbnClient;
    this.log = stackServices.log;

    this.wasStarted = true;
  }

  protected ensureStarted() {
    if (!this.wasStarted) {
      throw new Error('RunContext instance has not been `.start()`ed!');
    }
  }

  getEsClient(): Client {
    this.ensureStarted();
    return this.esClient!;
  }

  getKbnClient(): KbnClient {
    this.ensureStarted();
    return this.kbnClient!;
  }

  getLogger(): ToolingLog {
    this.ensureStarted();
    return this.log!;
  }
}
