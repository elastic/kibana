/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosError } from 'axios';
import { omitBy, isNil } from 'lodash/fp';
import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { schema } from '@kbn/config-schema';
import {
  throwIfResponseIsNotValid,
  getErrorMessage,
} from '@kbn/actions-plugin/server/lib/axios_utils';
import {
  CreateCommentParams,
  CreateIncidentData,
  CreateIncidentParams,
  ExternalServiceIncidentResponse,
  Incident,
  PushToServiceApiHandlerArgs,
  PushToServiceResponse,
  ResilientConfig,
  ResilientSecrets,
  UpdateIncidentParams,
} from './types';
import * as i18n from './translations';
import { SUB_ACTION } from './constants';
import {
  ExecutorSubActionCommonFieldsParamsSchema,
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionGetIncidentTypesParamsSchema,
  ExecutorSubActionGetSeverityParamsSchema,
  ExecutorSubActionHandshakeParamsSchema,
  ExecutorSubActionPushParamsSchema,
  ExternalServiceCommentResponseSchema,
  GetCommonFieldsResponseSchema,
  GetIncidentResponseSchema,
  GetIncidentTypesResponseSchema,
  GetSeverityResponseSchema,
} from './schema';
import { formatUpdateRequest } from './utils';

const VIEW_INCIDENT_URL = `#incidents`;

export class ResilientConnector extends SubActionConnector<ResilientConfig, ResilientSecrets> {
  private urls: {
    incidentTypes: string;
    incident: string;
    comment: string;
    severity: string;
  };

  constructor(params: ServiceParams<ResilientConfig, ResilientSecrets>) {
    super(params);

    this.urls = {
      incidentTypes: `${this.getIncidentFieldsUrl()}/incident_type_ids`,
      incident: `${this.getOrgUrl()}/incidents`,
      comment: `${this.getOrgUrl()}/incidents/{inc_id}/comments`,
      severity: `${this.getIncidentFieldsUrl()}/severity_code`,
    };

    this.registerSubActions();
  }

  protected getResponseErrorMessage(error: AxiosError) {
    if (!error.response?.status) {
      return i18n.UNKNOWN_API_ERROR;
    }
    if (error.response.status === 401) {
      return i18n.UNAUTHORIZED_API_ERROR;
    }
    return `API Error: ${error.response?.statusText}`;
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.INCIDENT_TYPES,
      method: 'getIncidentTypes',
      schema: ExecutorSubActionGetIncidentTypesParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.SEVERITY,
      method: 'getSeverity',
      schema: ExecutorSubActionGetSeverityParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.FIELDS,
      method: 'getFields',
      schema: ExecutorSubActionCommonFieldsParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.INCIDENT,
      method: 'getIncident',
      schema: ExecutorSubActionGetIncidentParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.PUSH_TO_SERVICE,
      method: 'pushToService',
      schema: ExecutorSubActionPushParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.HANDSHAKE,
      method: 'handshake',
      schema: ExecutorSubActionHandshakeParamsSchema,
    });
  }

  private getAuthHeaders() {
    // return { api_key_id: this.secrets.apiKeyId, api_key_secret: this.secrets.apiKeySecret };
    return { username: this.secrets.apiKeyId, password: this.secrets.apiKeySecret };
  }

  private getOrgUrl() {
    const { apiUrl: url, orgId } = this.config;
    // const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;

    return `${url}/rest/orgs/${orgId}`;
  }

  private getIncidentFieldsUrl = () => `${this.getOrgUrl()}/types/incident/fields`;

  private getIncidentViewURL(key: string) {
    const url = this.config.apiUrl;
    const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;

    return `${urlWithoutTrailingSlash}/${VIEW_INCIDENT_URL}/${key}`;
  }

  private async createIncident({
    incident,
  }: CreateIncidentParams): Promise<ExternalServiceIncidentResponse> {
    try {
      let data: CreateIncidentData = {
        name: incident.name,
        discovered_date: Date.now(),
      };

      if (incident.description) {
        data = {
          ...data,
          description: {
            format: 'html',
            content: incident.description ?? '',
          },
        };
      }

      if (incident.incidentTypes) {
        data = {
          ...data,
          incident_type_ids: incident.incidentTypes.map((id) => ({ id })),
        };
      }

      if (incident.severityCode) {
        data = {
          ...data,
          severity_code: { id: incident.severityCode },
        };
      }
      const res = await this.request({
        url: `${this.urls.incident}?text_content_output_format=objects_convert`,
        method: 'POST',
        data,
        headers: this.getAuthHeaders(),
        responseSchema: schema.object({
          id: schema.string(),
          create_date: schema.string(),
        }),
      });

      throwIfResponseIsNotValid({
        res,
        requiredAttributesToBeInTheResponse: ['id', 'create_date'],
      });

      return {
        title: `${res.data.id}`,
        id: `${res.data.id}`,
        pushedDate: new Date(res.data.create_date).toISOString(),
        url: this.getIncidentViewURL(res.data.id),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to create incident. Error: ${error.message}.`)
      );
    }
  }

  private async updateIncident({
    incidentId,
    incident,
  }: UpdateIncidentParams): Promise<ExternalServiceIncidentResponse> {
    try {
      const latestIncident = await this.getIncident(incidentId);

      // Remove null or undefined values. Allowing null values sets the field in IBM Resilient to empty.
      const newIncident = omitBy(isNil, incident);
      const data = formatUpdateRequest({ oldIncident: latestIncident, newIncident });

      const res = await this.request({
        method: 'PATCH',
        url: `${this.urls.incident}/${incidentId}`,
        data,
        // headers: this.getAuthHeaders(),
        responseSchema: schema.object({
          success: schema.boolean(),
          message: schema.string(),
        }),
      });

      throwIfResponseIsNotValid({
        res,
      });

      if (!res.data.success) {
        throw new Error(res.data.message);
      }

      const updatedIncident = await this.getIncident(incidentId);

      return {
        title: `${updatedIncident.id}`,
        id: `${updatedIncident.id}`,
        pushedDate: new Date(updatedIncident.inc_last_modified_date).toISOString(),
        url: this.getIncidentViewURL(updatedIncident.id),
      };
    } catch (error) {
      throw new Error(`Unable to update incident with id ${incidentId}. Error: ${error.message}`);
    }
  }

  private async createComment({ incidentId, comment }: CreateCommentParams) {
    try {
      const res = await this.request({
        method: 'POST',
        url: this.urls.comment.replace('{inc_id}', incidentId),
        data: { text: { format: 'text', content: comment.comment } },
        headers: this.getAuthHeaders(),
        responseSchema: schema.object({
          id: schema.string(),
          create_date: schema.string(),
          comment: ExternalServiceCommentResponseSchema,
        }),
      });

      throwIfResponseIsNotValid({
        res,
      });

      return {
        commentId: comment.commentId,
        externalCommentId: res.data.id,
        pushedDate: new Date(res.data.create_date).toISOString(),
      };
    } catch (error) {
      throw new Error(
        `Unable to create comment at incident with id ${incidentId}. Error: ${error.message}.`
      );
    }
  }

  public async getIncidentTypes() {
    try {
      console.log('resilient_new_connector_getIncidentTypes', {
        url: this.urls.incidentTypes,
        headers: this.getAuthHeaders(),
      });
      const res = await this.request({
        method: 'GET',
        url: this.urls.incidentTypes,
        headers: this.getAuthHeaders(),
        responseSchema: GetIncidentTypesResponseSchema,
      });

      throwIfResponseIsNotValid({
        res,
      });

      return res.data ?? [];
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to get incident types. Error: ${error.message}.`)
      );
    }
  }

  public async getSeverity() {
    try {
      const res = await this.request({
        method: 'GET',
        url: this.urls.severity,
        headers: this.getAuthHeaders(),
        responseSchema: GetSeverityResponseSchema,
      });

      throwIfResponseIsNotValid({
        res,
      });

      return res.data ?? [];
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to get severity. Error: ${error.message}.`)
      );
    }
  }

  public async getFields() {
    try {
      const res = await this.request({
        method: 'GET',
        url: this.getIncidentFieldsUrl(),
        headers: this.getAuthHeaders(),
        responseSchema: GetCommonFieldsResponseSchema,
      });

      throwIfResponseIsNotValid({
        res,
      });

      return res.data ?? [];
    } catch (error) {
      throw new Error(getErrorMessage(i18n.NAME, `Unable to get fields. Error: ${error.message}.`));
    }
  }

  public async getIncident(id: string) {
    try {
      const res = await this.request({
        method: 'GET',
        url: `${this.urls.incident}/${id}`,
        params: {
          text_content_output_format: 'objects_convert',
        },
        headers: this.getAuthHeaders(),
        responseSchema: GetIncidentResponseSchema,
      });

      throwIfResponseIsNotValid({
        res,
      });

      return { ...res.data, description: res.data?.description?.content ?? '' };
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to get incident with id ${id}. Error: ${error.message}.`)
      );
    }
  }

  public async pushToService({
    params,
  }: PushToServiceApiHandlerArgs): Promise<PushToServiceResponse> {
    const { comments } = params;
    let res: PushToServiceResponse;
    const { externalId, ...rest } = params.incident;
    const incident: Incident = rest;

    if (externalId != null) {
      res = await this.updateIncident({
        incidentId: externalId,
        incident,
      });
    } else {
      res = await this.createIncident({
        incident,
      });
    }

    if (comments && Array.isArray(comments) && comments.length > 0) {
      res.comments = [];
      for (const currentComment of comments) {
        const comment = await this.createComment({
          incidentId: res.id,
          comment: currentComment,
        });
        res.comments = [
          ...(res.comments ?? []),
          {
            commentId: comment.commentId,
            pushedDate: comment.pushedDate,
            externalCommentId: comment.externalCommentId ?? null,
          },
        ];
      }
    }

    return res;
  }

  public async handshake() {}
}
