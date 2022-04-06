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

interface CaseConnectorInterface<T extends unknown> {
  // TO DO need to implement a better type
  // addIncidentComment: (comment: any) => Promise<any>;
  createIncident: (incident: Partial<Incident>) => Promise<T>;
  // deleteIncident: (incident: any) => Promise<any>;
  // getIncident: (incidentId: string) => Promise<any>;
  // getFields: () => Promise<any>;
}

export abstract class CaseConnector<T extends unknown> implements CaseConnectorInterface<T> {
  private axiosInstance: AxiosInstance | undefined;
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

    const { httpAgent, httpsAgent } = getCustomAgents(
      this.configurationUtilities,
      this.logger,
      url
    );
    const { maxContentLength, timeout } = this.configurationUtilities.getResponseSettings();

    return await this.axiosInstance(url, {
      ...rest,
      method,
      data: data ?? {},
      // use httpAgent and httpsAgent and set axios proxy: false, to be able to handle fail on invalid certs
      httpAgent,
      httpsAgent,
      proxy: false,
      maxContentLength,
      timeout,
    });
  }
}
