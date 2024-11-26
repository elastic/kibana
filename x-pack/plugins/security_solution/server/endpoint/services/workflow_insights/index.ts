/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReplaySubject, firstValueFrom, combineLatest } from 'rxjs';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';

import { SecurityWorkflowInsightsFailedInitialized } from './errors';
import { createDatastream, createPipeline } from './helpers';
import { DATA_STREAM_NAME } from './constants';

interface SetupInterface {
  kibanaVersion: string;
  logger: Logger;
  isFeatureEnabled: boolean;
}

interface StartInterface {
  esClient: ElasticsearchClient;
}

class SecurityWorkflowInsightsService {
  private setup$ = new ReplaySubject<void>(1);
  private start$ = new ReplaySubject<void>(1);
  private stop$ = new ReplaySubject<void>(1);
  private ds: DataStreamSpacesAdapter | undefined;
  // private _esClient: ElasticsearchClient | undefined;
  private _logger: Logger | undefined;
  private _isInitialized: Promise<[void, void]> = firstValueFrom(
    combineLatest<[void, void]>([this.setup$, this.start$])
  );
  private isFeatureEnabled = false;

  public get isInitialized() {
    return this._isInitialized;
  }

  public setup({ kibanaVersion, logger, isFeatureEnabled }: SetupInterface) {
    this.isFeatureEnabled = isFeatureEnabled;
    if (!isFeatureEnabled) {
      return;
    }

    this._logger = logger;

    try {
      this.ds = createDatastream(kibanaVersion);
    } catch (err) {
      this.logger.warn(new SecurityWorkflowInsightsFailedInitialized(err.message).message);
      return;
    }

    this.setup$.next();
  }

  public async start({ esClient }: StartInterface) {
    if (!this.isFeatureEnabled) {
      return;
    }

    // this._esClient = esClient;
    await firstValueFrom(this.setup$);

    try {
      await createPipeline(esClient);
      await this.ds?.install({
        logger: this.logger,
        esClient,
        pluginStop$: this.stop$,
      });
      await esClient.indices.createDataStream({ name: DATA_STREAM_NAME });
    } catch (err) {
      // ignore datastream already exists error
      if (err?.body?.error?.type === 'resource_already_exists_exception') {
        return;
      }

      this.logger.warn(new SecurityWorkflowInsightsFailedInitialized(err.message).message);
      return;
    }

    this.start$.next();
  }

  public stop() {
    this.setup$.next();
    this.setup$.complete();
    this.start$.next();
    this.start$.complete();
    this.stop$.next();
    this.stop$.complete();
  }

  public async create() {
    await this.isInitialized;
  }

  public async update() {
    await this.isInitialized;
  }

  public async fetch() {
    await this.isInitialized;
  }

  // to be used in create/update/fetch above
  // private get esClient(): ElasticsearchClient {
  //   if (!this._esClient) {
  //     throw new SecurityWorkflowInsightsFailedInitialized('no elasticsearch client found');
  //   }

  //   return this._esClient;
  // }

  private get logger(): Logger {
    if (!this._logger) {
      throw new SecurityWorkflowInsightsFailedInitialized('no logger found');
    }

    return this._logger;
  }
}

export const securityWorkflowInsightsService = new SecurityWorkflowInsightsService();
