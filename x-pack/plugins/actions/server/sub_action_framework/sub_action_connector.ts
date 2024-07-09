/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject, isEmpty } from 'lodash';
import { Type } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';
import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  AxiosRequestHeaders,
  AxiosHeaders,
  AxiosHeaderValue,
  AxiosBasicCredentials,
} from 'axios';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { finished } from 'stream/promises';
import { IncomingMessage } from 'http';
import { PassThrough } from 'stream';
import { KibanaRequest } from '@kbn/core-http-server';
import { inspect } from 'util';
import { assertURL } from './helpers/validators';
import { ActionsConfigurationUtilities } from '../actions_config';
import { SubAction, SubActionRequestParams } from './types';
import { ServiceParams } from './types';
import * as i18n from './translations';
import { request } from '../lib/axios_utils';
import { combineHeadersWithBasicAuthHeader } from '../lib/get_basic_auth_header';

const isObject = (value: unknown): value is Record<string, unknown> => {
  return isPlainObject(value);
};

const isAxiosError = (error: unknown): error is AxiosError => (error as AxiosError).isAxiosError;

export abstract class SubActionConnector<Config, Secrets> {
  [k: string]: ((params: unknown) => unknown) | unknown;
  private axiosInstance: AxiosInstance;
  private subActions: Map<string, SubAction> = new Map();
  private configurationUtilities: ActionsConfigurationUtilities;
  protected readonly kibanaRequest?: KibanaRequest;
  protected logger: Logger;
  protected esClient: ElasticsearchClient;
  protected savedObjectsClient: SavedObjectsClientContract;
  protected connector: ServiceParams<Config, Secrets>['connector'];
  protected config: Config;
  protected secrets: Secrets;

  constructor(params: ServiceParams<Config, Secrets>) {
    this.connector = params.connector;
    this.logger = params.logger;
    this.config = params.config;
    this.secrets = params.secrets;
    this.savedObjectsClient = params.services.savedObjectsClient;
    this.esClient = params.services.scopedClusterClient;
    this.configurationUtilities = params.configurationUtilities;
    this.axiosInstance = axios.create();
    this.kibanaRequest = params.request;
  }

  private normalizeURL(url: string) {
    const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
    const replaceDoubleSlashesRegex = new RegExp('([^:]/)/+', 'g');
    return urlWithoutTrailingSlash.replace(replaceDoubleSlashesRegex, '$1');
  }

  private normalizeData(data: unknown | undefined | null) {
    if (isEmpty(data)) {
      return {};
    }

    return data;
  }

  private assertURL(url: string) {
    assertURL(url);
  }

  private ensureUriAllowed(url: string) {
    try {
      this.configurationUtilities.ensureUriAllowed(url);
    } catch (allowedListError) {
      throw new Error(i18n.ALLOWED_HOSTS_ERROR(allowedListError.message));
    }
  }

  private getHeaders(
    auth?: AxiosBasicCredentials,
    headers?: AxiosRequestHeaders
  ): Record<string, AxiosHeaderValue> {
    const headersWithBasicAuth = combineHeadersWithBasicAuthHeader({
      username: auth?.username,
      password: auth?.password,
      headers,
    });

    return { 'Content-Type': 'application/json', ...headersWithBasicAuth };
  }

  private validateResponse(responseSchema: Type<unknown>, data: unknown) {
    try {
      responseSchema.validate(data);
    } catch (resValidationError) {
      const err = new Error(`Response validation failed (${resValidationError})`);
      this.logger.debug(() => `${err.message}:\n${inspect(data, { depth: 10 })}`);
      throw err;
    }
  }

  protected registerSubAction(subAction: SubAction) {
    this.subActions.set(subAction.name, subAction);
  }

  protected removeNullOrUndefinedFields(data: unknown | undefined) {
    if (isObject(data)) {
      return Object.fromEntries(Object.entries(data).filter(([_, value]) => value != null));
    }

    return data;
  }

  public getSubActions() {
    return this.subActions;
  }

  protected abstract getResponseErrorMessage(error: AxiosError): string;

  protected async request<R>({
    url,
    data,
    method = 'get',
    responseSchema,
    headers,
    timeout,
    ...config
  }: SubActionRequestParams<R>): Promise<AxiosResponse<R>> {
    try {
      this.assertURL(url);
      this.ensureUriAllowed(url);
      const normalizedURL = this.normalizeURL(url);

      this.logger.debug(
        `Request to external service. Connector Id: ${this.connector.id}. Connector type: ${this.connector.type} Method: ${method}. URL: ${normalizedURL}`
      );

      const { auth, ...restConfig } = config;

      const res = await request({
        ...restConfig,
        axios: this.axiosInstance,
        url: normalizedURL,
        logger: this.logger,
        method,
        data: this.normalizeData(data),
        configurationUtilities: this.configurationUtilities,
        headers: this.getHeaders(auth, headers as AxiosHeaders),
        timeout,
      });

      this.validateResponse(responseSchema, res.data);

      return res;
    } catch (error) {
      if (isAxiosError(error)) {
        this.logger.debug(
          `Request to external service failed. Connector Id: ${this.connector.id}. Connector type: ${this.connector.type}. Method: ${error.config?.method}. URL: ${error.config?.url}`
        );

        let responseBody = '';

        // The error response body may also be a stream, e.g. for the GenAI connector
        if (error.response?.config?.responseType === 'stream' && error.response?.data) {
          try {
            const incomingMessage = error.response.data as IncomingMessage;

            const pt = incomingMessage.pipe(new PassThrough());

            pt.on('data', (chunk) => {
              responseBody += chunk.toString();
            });

            await finished(pt);

            error.response.data = JSON.parse(responseBody);
          } catch {
            // the response body is a nice to have, no worries if it fails
          }
        }

        const errorMessage = `Status code: ${
          error.status ?? error.response?.status
        }. Message: ${this.getResponseErrorMessage(error)}`;
        throw new Error(errorMessage);
      }

      throw error;
    }
  }
}
