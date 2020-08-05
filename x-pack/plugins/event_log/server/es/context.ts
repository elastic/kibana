/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, LegacyClusterClient } from 'src/core/server';

import { EsNames, getEsNames } from './names';
import { initializeEs } from './init';
import { ClusterClientAdapter, IClusterClientAdapter } from './cluster_client_adapter';
import { createReadySignal, ReadySignal } from '../lib/ready_signal';

export type EsClusterClient = Pick<LegacyClusterClient, 'callAsInternalUser' | 'asScoped'>;

export interface EsContext {
  logger: Logger;
  esNames: EsNames;
  esAdapter: IClusterClientAdapter;
  initialize(): void;
  waitTillReady(): Promise<boolean>;
  initialized: boolean;
}

export interface EsError {
  readonly statusCode: number;
  readonly message: string;
}

export function createEsContext(params: EsContextCtorParams): EsContext {
  return new EsContextImpl(params);
}

export interface EsContextCtorParams {
  logger: Logger;
  clusterClientPromise: Promise<EsClusterClient>;
  indexNameRoot: string;
}

class EsContextImpl implements EsContext {
  public readonly logger: Logger;
  public readonly esNames: EsNames;
  public esAdapter: IClusterClientAdapter;
  private readonly readySignal: ReadySignal<boolean>;
  public initialized: boolean;

  constructor(params: EsContextCtorParams) {
    this.logger = params.logger;
    this.esNames = getEsNames(params.indexNameRoot);
    this.readySignal = createReadySignal();
    this.initialized = false;
    this.esAdapter = new ClusterClientAdapter({
      logger: params.logger,
      clusterClientPromise: params.clusterClientPromise,
    });
  }

  initialize() {
    // only run the initialization method once
    if (this.initialized) return;
    this.initialized = true;

    this.logger.debug('initializing EsContext');

    setImmediate(async () => {
      try {
        const success = await this._initialize();
        this.logger.debug(`readySignal.signal(${success})`);
        this.readySignal.signal(success);
      } catch (err) {
        this.logger.debug('readySignal.signal(false)');
        this.readySignal.signal(false);
      }
    });
  }

  // waits till the ES initialization is done, returns true if it was successful,
  // false if it was not successful
  async waitTillReady(): Promise<boolean> {
    return await this.readySignal.wait();
  }

  private async _initialize(): Promise<boolean> {
    return await initializeEs(this);
  }
}
