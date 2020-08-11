/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { ExternalServiceCredentials, ExternalService, ExternalServiceParams } from '../case/types';
import { Logger } from '../../../../../../src/core/server';
import {
  JiraPublicConfigurationType,
  JiraSecretConfigurationType,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  CreateCommentRequest,
} from './types';

import * as i18n from './translations';
import { request, getErrorMessage } from '../lib/axios_utils';
import { ProxySettings } from '../../types';

const VERSION = '2';
const BASE_URL = `rest/api/${VERSION}`;
const INCIDENT_URL = `issue`;
const COMMENT_URL = `comment`;

const VIEW_INCIDENT_URL = `browse`;

export const createExternalService = (
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  proxySettings?: ProxySettings
): ExternalService => {
  const { apiUrl: url, projectKey } = config as JiraPublicConfigurationType;
  const { apiToken, email } = secrets as JiraSecretConfigurationType;

  if (!url || !projectKey || !apiToken || !email) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const incidentUrl = `${url}/${BASE_URL}/${INCIDENT_URL}`;
  const commentUrl = `${incidentUrl}/{issueId}/${COMMENT_URL}`;
  const axiosInstance = axios.create({
    auth: { username: email, password: apiToken },
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
        logger,
        proxySettings,
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
    // The response from Jira when creating an issue contains only the key and the id.
    // The function makes two calls when creating an issue. One to create the issue and one to get
    // the created issue with all the necessary fields.
    try {
      const res = await request<CreateIncidentRequest>({
        axios: axiosInstance,
        url: `${incidentUrl}`,
        logger,
        method: 'post',
        data: {
          fields: { ...incident, project: { key: projectKey }, issuetype: { name: 'Task' } },
        },
        proxySettings,
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
        logger,
        data: { fields: { ...incident } },
        proxySettings,
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
        logger,
        data: { body: comment.comment },
        proxySettings,
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
