/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosError } from 'axios';
import { omitBy, isNil } from 'lodash/fp';
import { CaseConnector, ServiceParams } from '@kbn/actions-plugin/server';
import { schema } from '@kbn/config-schema';
import { getErrorMessage } from '@kbn/actions-plugin/server/lib/axios_utils';
import {
  CreateIncidentData,
  ExternalServiceIncidentResponse,
  GetIncidentTypesResponse,
  GetSeverityResponse,
  Incident,
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
  GetCommonFieldsResponseSchema,
  GetIncidentTypesResponseSchema,
  GetSeverityResponseSchema,
} from './schema';
import { formatUpdateRequest } from './utils';

const VIEW_INCIDENT_URL = `#incidents`;

export class ResilientConnector extends CaseConnector<ResilientConfig, ResilientSecrets> {
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
      name: SUB_ACTION.HANDSHAKE,
      method: 'handshake',
      schema: ExecutorSubActionHandshakeParamsSchema,
    });
  }

  private getAuthHeaders() {
    const token = Buffer.from(
      this.secrets.apiKeyId + ':' + this.secrets.apiKeySecret,
      'utf8'
    ).toString('base64');

    return { Authorization: `Basic ${token}` };
  }

  private getOrgUrl() {
    const { apiUrl: url, orgId } = this.config;

    return `${url}rest/orgs/${orgId}`;
  }

  private getIncidentFieldsUrl = () => `${this.getOrgUrl()}/types/incident/fields`;

  private getIncidentViewURL(key: string) {
    const url = this.config.apiUrl;
    const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;

    return `${urlWithoutTrailingSlash}/${VIEW_INCIDENT_URL}/${key}`;
  }

  public async createIncident({
    incident,
  }: Record<string, unknown>): Promise<ExternalServiceIncidentResponse> {
    try {
      const incidentData = incident as Incident;
      let data: CreateIncidentData = {
        name: incidentData?.name,
        discovered_date: Date.now(),
      };

      if (incidentData?.description) {
        data = {
          ...data,
          description: {
            format: 'html',
            content: incidentData.description ?? '',
          },
        };
      }

      if (incidentData?.incidentTypes) {
        data = {
          ...data,
          incident_type_ids: incidentData.incidentTypes.map((id: number | string) => ({
            id: Number(id),
          })),
        };
      }

      if (incidentData?.severityCode) {
        data = {
          ...data,
          severity_code: { id: Number(incidentData.severityCode) },
        };
      }

      const res = await this.request({
        url: `${this.urls.incident}?text_content_output_format=objects_convert`,
        method: 'POST',
        data,
        headers: this.getAuthHeaders(),
        responseSchema: schema.object(
          {
            id: schema.number(),
            create_date: schema.number(),
          },
          { unknowns: 'allow' }
        ),
      });

      const { id, create_date: createDate } = res.data;

      return {
        title: `${id}`,
        id: `${id}`,
        pushedDate: new Date(createDate).toISOString(),
        url: this.getIncidentViewURL(id.toString()),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to create incident. Error: ${error.message}.`)
      );
    }
  }

  public async updateIncident({
    incidentId,
    incident,
  }: UpdateIncidentParams): Promise<ExternalServiceIncidentResponse> {
    try {
      const latestIncident = await this.getIncident({ id: incidentId });

      // Remove null or undefined values. Allowing null values sets the field in IBM Resilient to empty.
      const newIncident = omitBy(isNil, incident);
      const data = formatUpdateRequest({ oldIncident: latestIncident, newIncident });

      const res = await this.request({
        method: 'PATCH',
        url: `${this.urls.incident}/${incidentId}`,
        data,
        headers: this.getAuthHeaders(),
        responseSchema: schema.object({ success: schema.boolean() }, { unknowns: 'allow' }),
      });

      if (!res.data.success) {
        throw new Error('Error while updating incident');
      }

      const updatedIncident = await this.getIncident({ id: incidentId });

      return {
        title: `${updatedIncident.id}`,
        id: `${updatedIncident.id}`,
        pushedDate: new Date(updatedIncident.inc_last_modified_date).toISOString(),
        url: this.getIncidentViewURL(updatedIncident.id.toString()),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to update incident with id ${incidentId}. Error: ${error.message}.`
        )
      );
    }
  }

  public async addComment({ incidentId, comment }: { incidentId: string; comment: string }) {
    try {
      const res = await this.request({
        method: 'POST',
        url: this.urls.comment.replace('{inc_id}', incidentId),
        data: { text: { format: 'text', content: comment } },
        headers: this.getAuthHeaders(),
        responseSchema: schema.object(
          {
            id: schema.number(),
            create_date: schema.number(),
            comment: schema.object({}, { unknowns: 'allow' }),
          },
          { unknowns: 'allow' }
        ),
      });

      return {
        comment,
        externalCommentId: res.data.id,
        pushedDate: new Date(res.data.create_date).toISOString(),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to create comment at incident with id ${incidentId}. Error: ${error.message}.`
        )
      );
    }
  }

  public async getIncident({ id }: { id: string }) {
    try {
      const res = await this.request({
        method: 'GET',
        url: `${this.urls.incident}/${id}`,
        params: {
          text_content_output_format: 'objects_convert',
        },
        headers: this.getAuthHeaders(),
        responseSchema: schema.object(
          {
            id: schema.number(),
            inc_last_modified_date: schema.number(),
          },
          { unknowns: 'allow' }
        ),
      });

      return res.data;
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to get incident with id ${id}. Error: ${error.message}.`)
      );
    }
  }

  public async getIncidentTypes(): Promise<GetIncidentTypesResponse> {
    try {
      const res = await this.request({
        method: 'GET',
        url: this.urls.incidentTypes,
        headers: this.getAuthHeaders(),
        responseSchema: GetIncidentTypesResponseSchema,
      });

      const incidentTypes = res.data?.values ?? [];

      return incidentTypes.map((type: { value: number; label: string }) => ({
        id: type.value.toString(),
        name: type.label,
      }));
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to get incident types. Error: ${error.message}.`)
      );
    }
  }

  public async getSeverity(): Promise<GetSeverityResponse> {
    try {
      const res = await this.request({
        method: 'GET',
        url: this.urls.severity,
        headers: this.getAuthHeaders(),
        responseSchema: GetSeverityResponseSchema,
      });

      const severities = res.data?.values ?? [];
      return severities.map((type: { value: number; label: string }) => ({
        id: type.value.toString(),
        name: type.label,
      }));
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

      const fields = res.data.map((field) => {
        return {
          name: field.name,
          input_type: field.input_type,
          read_only: field.read_only,
          required: field.required,
          text: field.text,
        };
      });

      return fields;
    } catch (error) {
      throw new Error(getErrorMessage(i18n.NAME, `Unable to get fields. Error: ${error.message}.`));
    }
  }

  public async handshake() {}
}
