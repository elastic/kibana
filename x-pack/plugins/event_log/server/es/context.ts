/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { Logger, ClusterClient } from 'src/core/server';

import { EsNames, getEsNames } from './names';
import { initializeEs } from './init';
import { createReadySignal, ReadySignal } from '../lib/ready_signal';

export type EsClusterClient = Pick<ClusterClient, 'callAsInternalUser' | 'asScoped'>;

export interface EsContext {
  logger: Logger;
  esNames: EsNames;
  initialize(): void;
  waitTillReady(): Promise<boolean>;
  callEs(operation: string, body?: any): Promise<any>;
}

export interface EsError {
  readonly statusCode: number;
  readonly message: string;
}

export function createEsContext(params: EsContextCtorParams): EsContext {
  return new EsContextImpl(params);
}

type EsClusterClient$ = Observable<EsClusterClient>;

export interface EsContextCtorParams {
  logger: Logger;
  clusterClient$: EsClusterClient$;
  indexNameRoot: string;
}

class EsContextImpl implements EsContext {
  public readonly logger: Logger;
  public readonly esNames: EsNames;
  private readonly clusterClient$: EsClusterClient$;
  private readonly readySignal: ReadySignal<boolean>;
  private initialized: boolean;

  constructor(params: EsContextCtorParams) {
    this.logger = params.logger;
    this.esNames = getEsNames(params.indexNameRoot);
    this.clusterClient$ = params.clusterClient$;
    this.readySignal = createReadySignal();
    this.initialized = false;
  }

  initialize() {
    // only run the initialization method once
    if (this.initialized) return;
    this.initialized = true;

    this.logger.debug('initializing EsContext');

    setImmediate(async () => {
      try {
        await this._initialize();
        this.logger.debug('readySignal.signal(true)');
        this.readySignal.signal(true);
      } catch (err) {
        this.logger.debug('readySignal.signal(false)');
        this.readySignal.signal(false);
      }
    });
  }

  async waitTillReady(): Promise<boolean> {
    return await this.readySignal.wait();
  }

  async callEs(operation: string, body?: any): Promise<any> {
    const clusterClient = await this.clusterClient$.pipe(first()).toPromise();

    try {
      this.debug(`callEs(${operation}) calls:`, body);
      const result = await clusterClient.callAsInternalUser(operation, body);
      this.debug(`callEs(${operation}) result:`, result);
      return result;
    } catch (err) {
      this.debug(`callEs(${operation}) error:`, {
        message: err.message,
        statusCode: err.statusCode,
      });
      throw err;
    }
  }

  private async _initialize() {
    await initializeEs(this);
  }

  private debug(message: string, object?: any) {
    const objectString = object == null ? '' : JSON.stringify(object);
    this.logger.debug(`esContext: ${message} ${objectString}`);
  }
}
