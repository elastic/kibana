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
} from './types';

import * as i18n from './translations';
import { getErrorMessage, request } from '../case/utils';

const VERSION = '2';
const BASE_URL = `rest/api/${VERSION}`;
const INCIDENT_URL = `issue`;
const COMMENT_URL = `comment`;

const VIEW_INCIDENT_URL = `browse`;

export const createExternalService = ({
  config,
  secrets,
}: ExternalServiceCredentials): ExternalService => {
  const { apiUrl: url, orgId } = config as ResilientPublicConfigurationType;
  const { apiKeyId, apiKeySecret } = secrets as ResilientSecretConfigurationType;

  if (!url || !orgId || !apiKeyId || !apiKeySecret) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const incidentUrl = `${url}/${BASE_URL}/${INCIDENT_URL}`;
  const commentUrl = `${incidentUrl}/{issueId}/${COMMENT_URL}`;
  const axiosInstance = axios.create({
    auth: { username: apiKeyId, password: apiKeySecret },
  });

  const getIncidentViewURL = (key: string) => {
    return `${url}/${VIEW_INCIDENT_URL}/${key}`;
  };

  const getCommentsURL = (issueId: string) => {
    return commentUrl.replace('{issueId}', issueId);
  };

  const getIncident = async (id: string) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: `${incidentUrl}/${id}`,
      });

      const { fields, ...rest } = res.data;

      return { ...rest, ...fields };
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to get incident with id ${id}. Error: ${error.message}`)
      );
    }
  };

  const createIncident = async ({ incident }: ExternalServiceParams) => {
    // The response from Resilient when creating an issue contains only the key and the id.
    // The function makes two calls when creating an issue. One to create the issue and one to get
    // the created issue with all the necessary fields.
    try {
      const res = await request<CreateIncidentRequest>({
        axios: axiosInstance,
        url: `${incidentUrl}`,
        method: 'post',
        data: {
          ...incident,
        },
      });

      const updatedIncident = await getIncident(res.data.id);

      return {
        title: updatedIncident.key,
        id: updatedIncident.id,
        pushedDate: new Date(updatedIncident.created).toISOString(),
        url: getIncidentViewURL(updatedIncident.key),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to create incident. Error: ${error.message}`)
      );
    }
  };

  const updateIncident = async ({ incidentId, incident }: ExternalServiceParams) => {
    try {
      await request<UpdateIncidentRequest>({
        axios: axiosInstance,
        method: 'put',
        url: `${incidentUrl}/${incidentId}`,
        data: { ...incident },
      });

      const updatedIncident = await getIncident(incidentId);

      return {
        title: updatedIncident.key,
        id: updatedIncident.id,
        pushedDate: new Date(updatedIncident.updated).toISOString(),
        url: getIncidentViewURL(updatedIncident.key),
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
        pushedDate: new Date(res.data.created).toISOString(),
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
