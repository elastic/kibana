/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import axios, { AxiosBasicCredentials, AxiosInstance, Method } from 'axios';
import { ActionsConfigurationUtilities } from '../actions_config';
import { getCustomAgents } from '../builtin_action_types/lib/get_custom_agents';
import { Incident } from '../builtin_action_types/servicenow/types';

export interface CaseConnectorInterface<T extends unknown> {
  // TO DO need to implement a better type
  // addIncidentComment: (comment: any) => Promise<any>;
  createIncident: (incident: Partial<Incident>) => Promise<T>;
  // deleteIncident: (incident: any) => Promise<any>;
  // getIncident: (incidentId: string) => Promise<any>;
  // getFields: () => Promise<any>;
}

const isObject = (v: unknown): v is Record<string, unknown> => {
  return typeof v === 'object' && v !== null;
};

export abstract class CaseConnector<T extends unknown> implements CaseConnectorInterface<T> {
  private axiosInstance: AxiosInstance | undefined;
  private validProtocols: string[] = ['http', 'https'];

  constructor(
    public configurationUtilities: ActionsConfigurationUtilities,
    public logger: Logger
  ) {}

  // abstract addIncidentComment: (comment: any) => Promise<any>;
  // abstract deleteIncident: (incident: any) => Promise<any>;
  // abstract getFields: () => Promise<any>;
  abstract createIncident(incident: Partial<Incident>): Promise<T>;
  // abstract getIncident: (incidentId: string) => Promise<any>;
  abstract getBasicAuth(): AxiosBasicCredentials;

  private normalizeURL(url: string) {
    const replaceDoubleSlashRegex = new RegExp('([^:]/)/+', 'g');
    return url.replace(replaceDoubleSlashRegex, '$1');
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

  public async request<R = unknown>({
    url,
    data,
    method = 'get',
    ...rest
  }: {
    url: string;
    data?: R;
    method?: Method;
  }) {
    if (!this.axiosInstance) {
      this.axiosInstance = axios.create({
        auth: this.getBasicAuth(),
      });
    }

    this.assertURL(url);
    const normalizedURL = this.normalizeURL(url);

    const { httpAgent, httpsAgent } = getCustomAgents(
      this.configurationUtilities,
      this.logger,
      url
    );
    const { maxContentLength, timeout } = this.configurationUtilities.getResponseSettings();

    // TODO: Add name of service/connector
    this.logger.debug(`Request to external service. Method: ${method}. URL: ${normalizedURL}`);

    return await this.axiosInstance(normalizedURL, {
      ...rest,
      method,
      data: this.normalizeData(data),
      // use httpAgent and httpsAgent and set axios proxy: false, to be able to handle fail on invalid certs
      httpAgent,
      httpsAgent,
      proxy: false,
      maxContentLength,
      timeout,
    });
  }
}
