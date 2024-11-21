/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import axios, { AxiosInstance, AxiosResponse, isAxiosError } from 'axios';
import { IncomingMessage } from 'http';
import { omit, pick } from 'lodash';
import { from, map, switchMap, throwError } from 'rxjs';
import { UrlObject, format, parse } from 'url';
import { inspect } from 'util';
import { isReadable } from 'stream';
import {
  ChatCompleteAPI,
  ChatCompleteCompositeResponse,
  OutputAPI,
  ChatCompletionEvent,
  InferenceTaskError,
  InferenceTaskErrorEvent,
  InferenceTaskEventType,
  createInferenceInternalError,
  withoutOutputUpdateEvents,
  type ToolOptions,
  ChatCompleteOptions,
} from '@kbn/inference-common';
import type { ChatCompleteRequestBody } from '../../common/http_apis';
import type { InferenceConnector } from '../../common/connectors';
import { createOutputApi } from '../../common/output/create_output_api';
import { eventSourceStreamIntoObservable } from '../../server/util/event_source_stream_into_observable';

// eslint-disable-next-line spaced-comment
/// <reference types="@kbn/ambient-ftr-types"/>

export interface ScriptInferenceClient {
  getConnectorId: () => string;
  chatComplete: ChatCompleteAPI;
  output: OutputAPI;
}

export class KibanaClient {
  axios: AxiosInstance;
  constructor(
    private readonly log: ToolingLog,
    private readonly url: string,
    private readonly spaceId?: string
  ) {
    this.axios = axios.create({
      headers: {
        'kbn-xsrf': 'foo',
      },
    });
  }

  private getUrl(props: { query?: UrlObject['query']; pathname: string; ignoreSpaceId?: boolean }) {
    const parsed = parse(this.url);

    const baseUrl = parsed.pathname?.replaceAll('/', '') ?? '';

    const url = format({
      ...parsed,
      pathname: `/${[
        ...(baseUrl ? [baseUrl] : []),
        ...(props.ignoreSpaceId || !this.spaceId ? [] : ['s', this.spaceId]),
        props.pathname.startsWith('/') ? props.pathname.substring(1) : props.pathname,
      ].join('/')}`,
      query: props.query,
    });

    return url;
  }

  callKibana<T>(
    method: string,
    props: { query?: UrlObject['query']; pathname: string; ignoreSpaceId?: boolean },
    data?: any
  ) {
    const url = this.getUrl(props);
    return this.axios<T>({
      method,
      url,
      data: data || {},
      headers: {
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'foo',
      },
    }).catch((error) => {
      if (isAxiosError(error)) {
        const interestingPartsOfError = {
          ...omit(error, 'request', 'response', 'config'),
          ...pick(
            error,
            'response.data',
            'response.headers',
            'response.status',
            'response.statusText'
          ),
        };
        this.log.error(inspect(interestingPartsOfError, { depth: 10 }));
      }
      throw error;
    });
  }

  async createSpaceIfNeeded() {
    if (!this.spaceId) {
      return;
    }

    this.log.debug(`Checking if space ${this.spaceId} exists`);

    const spaceExistsResponse = await this.callKibana<{
      id?: string;
    }>('GET', {
      pathname: `/api/spaces/space/${this.spaceId}`,
      ignoreSpaceId: true,
    }).catch((error) => {
      if (isAxiosError(error) && error.response?.status === 404) {
        return {
          status: 404,
          data: {
            id: undefined,
          },
        };
      }
      throw error;
    });

    if (spaceExistsResponse.data.id) {
      this.log.debug(`Space id ${this.spaceId} found`);
      return;
    }

    this.log.info(`Creating space ${this.spaceId}`);

    const spaceCreatedResponse = await this.callKibana<{ id: string }>(
      'POST',
      {
        pathname: '/api/spaces/space',
        ignoreSpaceId: true,
      },
      {
        id: this.spaceId,
        name: this.spaceId,
      }
    );

    if (spaceCreatedResponse.status === 200) {
      this.log.info(`Created space ${this.spaceId}`);
    } else {
      throw new Error(
        `Error creating space: ${spaceCreatedResponse.status} - ${spaceCreatedResponse.data}`
      );
    }
  }

  createInferenceClient({ connectorId }: { connectorId: string }): ScriptInferenceClient {
    function streamResponse(responsePromise: Promise<AxiosResponse>) {
      return from(responsePromise).pipe(
        switchMap((response) => {
          if (isReadable(response.data)) {
            return eventSourceStreamIntoObservable(response.data as IncomingMessage);
          }
          return throwError(() => createInferenceInternalError('Unexpected error', response.data));
        }),
        map((line) => {
          return JSON.parse(line) as ChatCompletionEvent | InferenceTaskErrorEvent;
        }),
        map((line) => {
          if (line.type === InferenceTaskEventType.error) {
            throw new InferenceTaskError(line.error.code, line.error.message, line.error.meta);
          }
          return line;
        })
      );
    }

    const chatCompleteApi: ChatCompleteAPI = <
      TToolOptions extends ToolOptions = ToolOptions,
      TStream extends boolean = false
    >({
      connectorId: chatCompleteConnectorId,
      messages,
      system,
      toolChoice,
      tools,
      functionCalling,
      stream,
    }: ChatCompleteOptions<TToolOptions, TStream>) => {
      const body: ChatCompleteRequestBody = {
        connectorId: chatCompleteConnectorId,
        system,
        messages,
        toolChoice,
        tools,
        functionCalling,
      };

      if (stream) {
        return streamResponse(
          this.axios.post(
            this.getUrl({
              pathname: `/internal/inference/chat_complete/stream`,
            }),
            body,
            { responseType: 'stream', timeout: NaN }
          )
        ) as ChatCompleteCompositeResponse<TToolOptions, TStream>;
      } else {
        return this.axios
          .post(
            this.getUrl({
              pathname: `/internal/inference/chat_complete/stream`,
            }),
            body,
            { responseType: 'stream', timeout: NaN }
          )
          .then((response) => {
            return response.data;
          }) as ChatCompleteCompositeResponse<TToolOptions, TStream>;
      }
    };

    const outputApi: OutputAPI = createOutputApi(chatCompleteApi);

    return {
      getConnectorId: () => connectorId,
      chatComplete: (options) => {
        return chatCompleteApi({
          ...options,
        });
      },
      output: (options) => {
        const response = outputApi({ ...options });
        if (options.stream) {
          return (response as any).pipe(withoutOutputUpdateEvents());
        } else {
          return response;
        }
      },
    };
  }

  async getConnectors() {
    const connectors: AxiosResponse<{ connectors: InferenceConnector[] }> = await axios.get(
      this.getUrl({
        pathname: '/internal/inference/connectors',
      })
    );

    return connectors.data.connectors;
  }
}
