/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, ElasticsearchClient } from '@kbn/core/server';

import { EsNames, getEsNames } from './names';
import { initializeEs } from './init';
import { ClusterClientAdapter, IClusterClientAdapter } from './cluster_client_adapter';
import { createReadySignal, ReadySignal } from '../lib/ready_signal';

export const RETRY_DELAY = 2000;

export interface EsContext {
  readonly logger: Logger;
  readonly esNames: EsNames;
  readonly esAdapter: IClusterClientAdapter;
  initialize(): void;
  shutdown(): Promise<void>;
  waitTillReady(): Promise<boolean>;
  readonly initialized: boolean;
  readonly retryDelay: number;
  shouldSetExistingAssetsToHidden: boolean;
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
  indexNameRoot: string;
  shouldSetExistingAssetsToHidden: boolean;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
}

class EsContextImpl implements EsContext {
  public readonly logger: Logger;
  public readonly esNames: EsNames;
  public esAdapter: IClusterClientAdapter;
  private readonly readySignal: ReadySignal<boolean>;
  public initialized: boolean;
  public readonly retryDelay: number;
  public readonly shouldSetExistingAssetsToHidden: boolean;

  constructor(params: EsContextCtorParams) {
    this.logger = params.logger;
    this.esNames = getEsNames(params.indexNameRoot);
    this.readySignal = createReadySignal();
    this.initialized = false;
    this.retryDelay = RETRY_DELAY;
    this.shouldSetExistingAssetsToHidden = params.shouldSetExistingAssetsToHidden;
    this.esAdapter = new ClusterClientAdapter({
      logger: params.logger,
      elasticsearchClientPromise: params.elasticsearchClientPromise,
      esNames: this.esNames,
      wait: () => this.readySignal.wait(),
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
        this.logger.debug(`readySignal.signal(false), reason: ${err.message}`);
        this.readySignal.signal(false);
      }
    });
  }

  async shutdown() {
    if (!this.readySignal.isEmitted()) {
      this.logger.debug('readySignal.signal(false); reason: Kibana server is shutting down');
      this.readySignal.signal(false);
    }
    await this.esAdapter.shutdown();
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
