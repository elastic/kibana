/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { ExternalServiceCredentials, ExternalService, ExternalServiceParams } from '../case/types';
import {
  ResilientPublicConfigurationType,
  ResilientSecretConfigurationType,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  CreateCommentRequest,
  UpdateFieldText,
  UpdateFieldTextArea,
} from './types';

import * as i18n from './translations';
import { getErrorMessage, request } from '../lib/axios_utils';

const BASE_URL = `rest`;
const INCIDENT_URL = `incidents`;
const COMMENT_URL = `comments`;

const VIEW_INCIDENT_URL = `#incidents`;

export const getValueTextContent = (
  field: string,
  value: string
): UpdateFieldText | UpdateFieldTextArea => {
  if (field === 'description') {
    return {
      textarea: {
        format: 'html',
        content: value,
      },
    };
  }

  return {
    text: value,
  };
};

export const formatUpdateRequest = ({
  oldIncident,
  newIncident,
}: ExternalServiceParams): UpdateIncidentRequest => {
  return {
    changes: Object.keys(newIncident).map((key) => ({
      field: { name: key },
      old_value: getValueTextContent(key, oldIncident[key]),
      new_value: getValueTextContent(key, newIncident[key]),
    })),
  };
};

export const createExternalService = ({
  config,
  secrets,
}: ExternalServiceCredentials): ExternalService => {
  const { apiUrl: url, orgId } = config as ResilientPublicConfigurationType;
  const { apiKeyId, apiKeySecret } = secrets as ResilientSecretConfigurationType;

  if (!url || !orgId || !apiKeyId || !apiKeySecret) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
  const incidentUrl = `${urlWithoutTrailingSlash}/${BASE_URL}/orgs/${orgId}/${INCIDENT_URL}`;
  const commentUrl = `${incidentUrl}/{inc_id}/${COMMENT_URL}`;
  const axiosInstance = axios.create({
    auth: { username: apiKeyId, password: apiKeySecret },
  });

  const getIncidentViewURL = (key: string) => {
    return `${urlWithoutTrailingSlash}/${VIEW_INCIDENT_URL}/${key}`;
  };

  const getCommentsURL = (incidentId: string) => {
    return commentUrl.replace('{inc_id}', incidentId);
  };

  const getIncident = async (id: string) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: `${incidentUrl}/${id}`,
        params: {
          text_content_output_format: 'objects_convert',
        },
      });

      return { ...res.data, description: res.data.description?.content ?? '' };
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to get incident with id ${id}. Error: ${error.message}`)
      );
    }
  };

  const createIncident = async ({ incident }: ExternalServiceParams) => {
    try {
      const res = await request<CreateIncidentRequest>({
        axios: axiosInstance,
        url: `${incidentUrl}`,
        method: 'post',
        data: {
          ...incident,
          description: {
            format: 'html',
            content: incident.description ?? '',
          },
          discovered_date: Date.now(),
        },
      });

      return {
        title: `${res.data.id}`,
        id: `${res.data.id}`,
        pushedDate: new Date(res.data.create_date).toISOString(),
        url: getIncidentViewURL(res.data.id),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to create incident. Error: ${error.message}`)
      );
    }
  };

  const updateIncident = async ({ incidentId, incident }: ExternalServiceParams) => {
    try {
      const latestIncident = await getIncident(incidentId);

      const data = formatUpdateRequest({ oldIncident: latestIncident, newIncident: incident });
      const res = await request<UpdateIncidentRequest>({
        axios: axiosInstance,
        method: 'patch',
        url: `${incidentUrl}/${incidentId}`,
        data,
      });

      if (!res.data.success) {
        throw new Error(res.data.message);
      }

      const updatedIncident = await getIncident(incidentId);

      return {
        title: `${updatedIncident.id}`,
        id: `${updatedIncident.id}`,
        pushedDate: new Date(updatedIncident.inc_last_modified_date).toISOString(),
        url: getIncidentViewURL(updatedIncident.id),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to update incident with id ${incidentId}. Error: ${error.message}`
        )
      );
    }
  };

  const createComment = async ({ incidentId, comment, field }: ExternalServiceParams) => {
    try {
      const res = await request<CreateCommentRequest>({
        axios: axiosInstance,
        method: 'post',
        url: getCommentsURL(incidentId),
        data: { text: { format: 'text', content: comment.comment } },
      });

      return {
        commentId: comment.commentId,
        externalCommentId: res.data.id,
        pushedDate: new Date(res.data.create_date).toISOString(),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to create comment at incident with id ${incidentId}. Error: ${error.message}`
        )
      );
    }
  };

  return {
    getIncident,
    createIncident,
    updateIncident,
    createComment,
  };
};
