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

type ExtractFunctionKeys<T> = { [P in keyof T]-?: T[P] extends Function ? P : never }[keyof T];

interface SubAction {
  name: string;
  method: ExtractFunctionKeys<CaseConnector>;
  schema: Type<unknown>;
}

interface PushToServiceParams {
  externalId: string;
  comments: Array<{ commentId: string; comment: string }>;
  [x: string]: unknown;
}

interface ExternalServiceIncidentResponse {
  id: string;
  title: string;
  url: string;
  pushedDate: string;
}

interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}
export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}

export interface CaseConnectorInterface {
  addComment: ({
    incidentId,
    comment,
  }: {
    incidentId: string;
    comment: string;
  }) => Promise<unknown>;
  createIncident: (incident: Record<string, unknown>) => Promise<ExternalServiceIncidentResponse>;
  updateIncident: ({
    incidentId,
    incident,
  }: {
    incidentId: string;
    incident: Record<string, unknown>;
  }) => Promise<ExternalServiceIncidentResponse>;
  getIncident: ({ id }: { id: string }) => Promise<unknown>;
  pushToService: (params: PushToServiceParams) => Promise<PushToServiceResponse>;
}

const isObject = (v: unknown): v is Record<string, unknown> => {
  return typeof v === 'object' && v !== null;
};

export abstract class CaseConnector implements CaseConnectorInterface {
  private axiosInstance: AxiosInstance;
  private validProtocols: string[] = ['http:', 'https:'];
  private subActions: Map<string, SubAction> = new Map();

  constructor(
    public configurationUtilities: ActionsConfigurationUtilities,
    public logger: Logger,
    auth: AxiosBasicCredentials
  ) {
    this.axiosInstance = axios.create({
      auth,
    });
  }

  public abstract addComment({
    incidentId,
    comment,
  }: {
    incidentId: string;
    comment: string;
  }): Promise<unknown>;

  public abstract createIncident(
    incident: Record<string, unknown>
  ): Promise<ExternalServiceIncidentResponse>;
  public abstract updateIncident({
    incidentId,
    incident,
  }: {
    incidentId: string;
    incident: Record<string, unknown>;
  }): Promise<ExternalServiceIncidentResponse>;
  public abstract getIncident({ id }: { id: string }): Promise<ExternalServiceIncidentResponse>;

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

  public registerSubAction(subAction: SubAction) {
    this.subActions.set(subAction.name, subAction);
  }

  public getSubActions() {
    return this.subActions;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async request<D = unknown, R = any>({
    url,
    data,
    method = 'get',
    responseSchema,
  }: {
    url: string;
    responseSchema: Type<R>;
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

    responseSchema.validate(res);

    return res;
  }

  public async pushToService(params: PushToServiceParams) {
    const { externalId, comments, ...rest } = params;

    let res: PushToServiceResponse;

    if (externalId != null) {
      res = await this.updateIncident({
        incidentId: externalId,
        incident: rest,
      });
    } else {
      res = await this.createIncident({
        ...rest,
      });
    }

    if (comments && Array.isArray(comments) && comments.length > 0) {
      res.comments = [];

      for (const currentComment of comments) {
        await this.addComment({
          incidentId: res.id,
          comment: currentComment.comment,
        });

        res.comments = [
          ...(res.comments ?? []),
          {
            commentId: currentComment.commentId,
            pushedDate: res.pushedDate,
          },
        ];
      }
    }

    return res;
  }
}
