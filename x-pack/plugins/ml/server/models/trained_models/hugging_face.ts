/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { BehaviorSubject } from 'rxjs';
import type { Observable } from 'rxjs';
import fetch, { HeaderInit } from 'node-fetch';
import { streamFactory } from '@kbn/aiops-utils';
import type { KibanaRequest, IScopedClusterClient } from '@kbn/core/server';
import { queue } from 'async';
import { HuggingFaceTrainedModel } from '../../../common/types/trained_models';
import type { MlConfigType } from '../../../config';
import { IMPORT_API_ACTION_NAME } from '../../../common/constants/trained_models';

type TrainedModelVocabulary = estypes.MlPutTrainedModelVocabularyRequest['body'];

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
      username === undefined || username === ''
        ? {}
        : {
            Authorization:
              'Basic ' + Buffer.from(`${username}:${password ?? ''}`, 'binary').toString('base64'),
          };
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
      return { type: IMPORT_API_ACTION_NAME.RESET };
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
          const {
            source: { total_definition_length: definitionSize, total_parts: definitionParts },
          } = await this.getHuggingFaceModelConfig(modelId);

          const config = await this.getModelConfig(modelId);

          push({
            type: IMPORT_API_ACTION_NAME.GET_CONFIG,
          });

          const vocab = await this.getModelVocabulary(modelId);

          push({
            type: IMPORT_API_ACTION_NAME.GET_VOCABULARY,
          });

          await this.putConfig(modelId, config);
          push({
            type: IMPORT_API_ACTION_NAME.PUT_CONFIG,
          });

          await this.putVocabulary(modelId, vocab);
          push({
            type: IMPORT_API_ACTION_NAME.PUT_VOCABULARY,
          });

          let completedParts = 0;
          const requestQueue = queue(async (partNo: number) => {
            const content = await this.getDefinitionPart(modelId, partNo);
            const b64 = content.toString('base64');

            await this.putDefinitionPart(modelId, partNo, definitionParts, definitionSize, b64);
            const progress = Number(completedParts / (definitionParts - 1)) * 100;
            completedParts++;
            push({
              type: 'put_definition_part',
              payload: { progress },
            });
          }, MAX_CONCURRENT_QUERIES);

          requestQueue.error((error) => {
            requestQueue.kill();
          });

          requestQueue.push(Array.from(Array(definitionParts).keys()), (error) => {
            if (error) {
              requestQueue.kill();
              push({ type: IMPORT_API_ACTION_NAME.ERROR, error: error.message });
              end();
            }
          });
          await requestQueue.drain();
          push({
            type: IMPORT_API_ACTION_NAME.COMPLETE,
          });
        } catch (error) {
          push({ type: IMPORT_API_ACTION_NAME.ERROR, error: error.message });
        }
      };

      await run();
      end();
    })();
    return responseWithHeaders;
  }

  private async getHuggingFaceModelConfig(modelId: string): Promise<HuggingFaceTrainedModel> {
    const resp = await fetch(`${this.serverUrl}${modelId}`, {
      method: 'GET',
      headers: this.authHeader,
    });
    return resp.json();
  }

  private async getModelConfig(modelId: string): Promise<estypes.MlTrainedModelConfig> {
    const url = `${this.serverUrl}${modelId}/config`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: this.authHeader,
    });
    if (resp.ok === false) {
      throw new Error('config not found');
    }
    return resp.json();
  }

  private async putConfig(id: string, config: estypes.MlTrainedModelConfig) {
    return this.client.asInternalUser.transport.request({
      method: 'PUT',
      path: `/_ml/trained_models/${id}`,
      body: config,
    });
  }

  private async getModelVocabulary(modelId: string): Promise<TrainedModelVocabulary> {
    const url = `${this.serverUrl}${modelId}/vocabulary`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: this.authHeader,
    });

    if (resp.ok === false) {
      throw new Error('vocabulary not found');
    }
    return resp.json();
  }

  private async putVocabulary(id: string, config: TrainedModelVocabulary) {
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
    if (resp.ok === false) {
      throw new Error('definition part not found');
    }
    return resp.buffer();
  }

  private async putDefinitionPart(
    id: string,
    partNumber: number,
    totalParts: number,
    totalLength: number,
    definitionB64: string
  ) {
    return this.client.asInternalUser.transport.request(
      {
        method: 'PUT',
        path: `/_ml/trained_models/${id}/definition/${partNumber}`,
        body: {
          definition: definitionB64,
          total_definition_length: totalLength,
          total_parts: totalParts,
        },
      },
      { maxRetries: 0 }
    );
  }
}
