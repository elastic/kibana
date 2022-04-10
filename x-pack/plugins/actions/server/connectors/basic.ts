/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Type } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import * as i18n from './translations';
import { ActionsConfigurationUtilities } from '../actions_config';
import { getCustomAgents } from '../builtin_action_types/lib/get_custom_agents';
import { SubAction } from './types';
import { ServiceParams } from '../http_framework/types';

const isObject = (v: unknown): v is Record<string, unknown> => {
  return typeof v === 'object' && v !== null;
};

export abstract class BasicConnector<Config, Secrets> {
  [k: string]: ((params: unknown) => unknown) | unknown;
  private axiosInstance: AxiosInstance;
  private validProtocols: string[] = ['http:', 'https:'];
  private subActions: Map<string, SubAction> = new Map();
  private configurationUtilities: ActionsConfigurationUtilities;
  protected logger: Logger;
  protected config: Config;
  protected secrets: Secrets;

  constructor(params: ServiceParams<Config, Secrets>) {
    this.logger = params.logger;
    this.config = params.config;
    this.secrets = params.secrets;
    this.configurationUtilities = params.configurationUtilities;
    this.axiosInstance = axios.create();
  }

  private normalizeURL(url: string) {
    const replaceDoubleSlashesRegex = new RegExp('([^:]/)/+', 'g');
    return url.replace(replaceDoubleSlashesRegex, '$1');
  }

  private removeNullOrUndefinedFields(data: unknown | undefined) {
    if (isObject(data)) {
      return Object.fromEntries(Object.entries(data).filter(([_, value]) => value != null));
    }

    return data;
  }

  private normalizeData(data: unknown | undefined | null) {
    if (data == null) {
      return {};
    }

    return this.removeNullOrUndefinedFields(data);
  }

  private assertURL(url: string) {
    try {
      const validURL = new URL(url);

      if (!this.validProtocols.includes(validURL.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      throw new Error(`URL Error: ${error.message}`);
    }
  }

  private ensureUriAllowed(url: string) {
    try {
      this.configurationUtilities.ensureUriAllowed(url);
    } catch (allowedListError) {
      return i18n.ALLOWED_HOSTS_ERROR(allowedListError.message);
    }
  }

  private getHeaders(headers: Record<string, string>) {
    return { ...headers, 'Content-Type': 'application/json' };
  }

  protected registerSubAction(subAction: SubAction) {
    this.subActions.set(subAction.name, subAction);
  }

  public getSubActions() {
    return this.subActions;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async request<R = any>({
    url,
    data,
    method = 'get',
    responseSchema,
    headers,
    ...config
  }: {
    url: string;
    responseSchema: Type<R>;
    method?: Method;
  } & AxiosRequestConfig): Promise<AxiosResponse<R>> {
    this.assertURL(url);
    this.ensureUriAllowed(url);
    const normalizedURL = this.normalizeURL(url);

    const { httpAgent, httpsAgent } = getCustomAgents(
      this.configurationUtilities,
      this.logger,
      url
    );
    const { maxContentLength, timeout } = this.configurationUtilities.getResponseSettings();

    // TODO: Add name of service/connector
    this.logger.debug(`Request to external service. Method: ${method}. URL: ${normalizedURL}`);

    const res = await this.axiosInstance(normalizedURL, {
      ...config,
      method,
      headers: this.getHeaders(headers),
      data: this.normalizeData(data),
      // use httpAgent and httpsAgent and set axios proxy: false, to be able to handle fail on invalid certs
      httpAgent,
      httpsAgent,
      proxy: false,
      maxContentLength,
      timeout,
    });

    responseSchema.validate(res.data);

    return res;
  }
}
