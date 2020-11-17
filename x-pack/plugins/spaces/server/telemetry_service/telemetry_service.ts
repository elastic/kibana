/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, CoreSetup } from '../../../../../src/core/server';
import { SPACES_TELEMETRY_TYPE } from '../constants';
import { TelemetryClient } from '../lib/telemetry_client';

export interface TelemetryServiceSetup {
  getClient(): Promise<TelemetryClient>;
}

interface TelemetryServiceDeps {
  getStartServices: CoreSetup['getStartServices'];
}

export class TelemetryService {
  constructor(private readonly log: Logger) {}

  public async setup({ getStartServices }: TelemetryServiceDeps): Promise<TelemetryServiceSetup> {
    const internalRepositoryPromise = getStartServices().then(([coreStart]) =>
      coreStart.savedObjects.createInternalRepository([SPACES_TELEMETRY_TYPE])
    );

    const getClient = async () => {
      const internalRepository = await internalRepositoryPromise;

      return new TelemetryClient((message: string) => {
        this.log.debug(message);
      }, internalRepository);
    };

    return { getClient };
  }

  public async stop() {}
}
