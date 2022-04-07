/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Type } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';
import axios, { AxiosBasicCredentials, AxiosInstance, AxiosResponse, Method } from 'axios';
import * as i18n from './translations';
import { ActionsConfigurationUtilities } from '../actions_config';
import { getCustomAgents } from '../builtin_action_types/lib/get_custom_agents';
import { Incident } from '../builtin_action_types/servicenow/types';

export interface CaseConnectorInterface<T extends unknown> {
  // TODO: need to implement a better type
  // addIncidentComment: (comment: any) => Promise<any>;
  createIncident: (incident: Partial<Incident>) => Promise<T>;
  // deleteIncident: (incident: any) => Promise<any>;
  // getIncident: (incidentId: string) => Promise<any>;
}

interface SubAction {
  name: string;
  method: string;
}

const isObject = (v: unknown): v is Record<string, unknown> => {
  return typeof v === 'object' && v !== null;
};

export abstract class CaseConnector<T extends unknown> implements CaseConnectorInterface<T> {
  private axiosInstance: AxiosInstance;
  private validProtocols: string[] = ['http', 'https'];
  public subActions: SubAction[] | undefined;

  constructor(
    public configurationUtilities: ActionsConfigurationUtilities,
    public logger: Logger,
    auth: AxiosBasicCredentials
  ) {
    this.axiosInstance = axios.create({
      auth,
    });
  }

  // abstract addIncidentComment: (comment: any) => Promise<any>;
  // abstract deleteIncident: (incident: any) => Promise<any>;
  // abstract getFields: () => Promise<any>;
  abstract createIncident(incident: Partial<Incident>): Promise<T>;
  // abstract getIncident: (incidentId: string) => Promise<any>;

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

  private normalizeData(data: unknown | undefined) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async request<D = unknown, R = any>({
    url,
    data,
    method = 'get',
  }: {
    url: string;
    data?: D;
    method?: Method;
  }): Promise<AxiosResponse<R>> {
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
      method,
      data: this.normalizeData(data),
      // use httpAgent and httpsAgent and set axios proxy: false, to be able to handle fail on invalid certs
      httpAgent,
      httpsAgent,
      proxy: false,
      maxContentLength,
      timeout,
    });

    return res;
  }
}
