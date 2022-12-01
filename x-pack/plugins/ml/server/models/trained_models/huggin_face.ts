/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { Observable } from 'rxjs';
import fetch, { HeaderInit } from 'node-fetch';
import { streamFactory } from '@kbn/aiops-utils';
import type { KibanaRequest, IScopedClusterClient } from '@kbn/core/server';
import { queue } from 'async';
import type { MlConfigType } from '../../../config';

export class HuggingFace {
  private serverUrl: string;
  private authHeader: HeaderInit;
  private request: KibanaRequest;
  private client: IScopedClusterClient;

  constructor(
    config$: Observable<MlConfigType>,
    request: KibanaRequest,
    client: IScopedClusterClient
  ) {
    this.request = request;
    this.client = client;
    const configSubject$ = new BehaviorSubject<MlConfigType>({});
    config$.subscribe(configSubject$);
    const { trainedModelsServer } = configSubject$.getValue();
    if (trainedModelsServer === undefined || trainedModelsServer.url === undefined) {
      throw new Error('No server configured');
    }

    const { username, password, url: modelServerUrl } = trainedModelsServer;
    this.serverUrl = `${modelServerUrl}/catalog/models/`;

    this.authHeader =
      username !== undefined
        ? {
            Authorization:
              'Basic ' + Buffer.from(`${username}:${password ?? ''}`, 'binary').toString('base64'),
          }
        : {};
  }

  public async serverExists() {
    try {
      const { ok } = await fetch(this.serverUrl, {
        method: 'HEAD',
        headers: this.authHeader,
      });
      return ok;
    } catch (error) {
      return false;
    }
  }

  public async getModelList() {
    const resp = await fetch(this.serverUrl, {
      method: 'GET',
      headers: this.authHeader,
    });
    return await resp.json();
  }

  public async importModel(modelId: string) {
    function resetAction() {
      return { type: 'reset' };
    }

    const MAX_CONCURRENT_QUERIES = 5;

    const { end, push, responseWithHeaders } = streamFactory<any>(
      this.request.headers,
      {
        error: (e: any) => {
          // eslint-disable-next-line no-console
          console.log(e);
        },
        debug: (e: any) => {
          // console.log(e);
        },
      } as any,
      true
    );

    (async () => {
      push(resetAction());

      const run = async () => {
        try {
          const meta = await this.getMetaData(modelId);
          const definitionSize: number = meta.source.total_definition_length;
          const definitionParts: number = meta.source.total_parts;

          const config = await this.getConfig(modelId);

          push({
            type: 'get_config',
          });

          const vocab = await this.getVocabulary(modelId);

          push({
            type: 'get_vocabulary',
          });

          await this.putConfig(modelId, config);
          push({
            type: 'put_config',
          });

          await this.putVocabulary(modelId, vocab);
          push({
            type: 'put_vocabulary',
          });

          let completedParts = 0;
          const requestQueue = queue(async (partNo: number) => {
            const content = await this.getDefinitionPart(modelId, partNo);
            const b64 = content.toString('base64');

            await this.putModelPart(modelId, partNo, definitionParts, definitionSize, b64);
            const progress = Number(completedParts / (definitionParts - 1)) * 100;
            completedParts++;
            push({
              type: 'put_definition_part',
              payload: { progress },
            });
          }, MAX_CONCURRENT_QUERIES);

          requestQueue.push(Array.from(Array(definitionParts).keys()));
          await requestQueue.drain();
          push({
            type: 'complete',
          });
        } catch (error) {
          push({ error });
        }
      };

      await run();
      end();
    })();
    return responseWithHeaders;
  }

  private async getMetaData(modelId: string) {
    const resp = await fetch(`${this.serverUrl}${modelId}`, {
      method: 'GET',
      headers: this.authHeader,
    });
    return resp.json();
  }

  private async getConfig(modelId: string) {
    const url = `${this.serverUrl}${modelId}/config`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: this.authHeader,
    });
    return resp.json();
  }

  private async putConfig(id: string, config: string) {
    return this.client.asInternalUser.transport.request({
      method: 'PUT',
      path: `/_ml/trained_models/${id}`,
      body: config,
    });
  }

  private async putModelPart(
    id: string,
    partNumber: number,
    totalParts: number,
    totalLength: number,
    definition: string
  ) {
    return this.client.asInternalUser.transport.request(
      {
        method: 'PUT',
        path: `/_ml/trained_models/${id}/definition/${partNumber}`,
        body: {
          definition,
          total_definition_length: totalLength,
          total_parts: totalParts,
        },
      },
      { maxRetries: 0 }
    );
  }

  private async getVocabulary(modelId: string) {
    const url = `${this.serverUrl}${modelId}/vocabulary`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: this.authHeader,
    });
    return resp.json();
  }

  private async putVocabulary(id: string, config: string) {
    return this.client.asInternalUser.transport.request({
      method: 'PUT',
      path: `/_ml/trained_models/${id}/vocabulary`,
      body: config,
    });
  }

  private async getDefinitionPart(modelId: string, part: number) {
    const resp = await fetch(`${this.serverUrl}${modelId}/definition/part/${part}`, {
      method: 'GET',
      headers: this.authHeader,
    });
    return resp.buffer();
  }
}
