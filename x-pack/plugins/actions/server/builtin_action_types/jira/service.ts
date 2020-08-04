/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { Logger } from '../../../../../../src/core/server';
import {
  ExternalServiceCredentials,
  ExternalService,
  ExternalServiceParams,
  CreateIncidentParams,
  JiraPublicConfigurationType,
  JiraSecretConfigurationType,
  Fields,
  CreateCommentParams,
  Incident,
  ResponseError,
  ExternalServiceIncidentResponse,
} from './types';

import * as i18n from './translations';
import { request, getErrorMessage } from '../lib/axios_utils';
import { ProxySettings } from '../../types';

const VERSION = '2';
const BASE_URL = `rest/api/${VERSION}`;
const CAPABILITIES_URL = `rest/capabilities`;
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
  const capabilitiesUrl = `${url}/${CAPABILITIES_URL}`;
  const commentUrl = `${incidentUrl}/{issueId}/${COMMENT_URL}`;
  const createIssueMetadataUrl = `${url}/${BASE_URL}/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes.fields`;
  const axiosInstance = axios.create({
    auth: { username: email, password: apiToken },
  });

  const getIncidentViewURL = (key: string) => {
    return `${url}/${VIEW_INCIDENT_URL}/${key}`;
  };

  const getCommentsURL = (issueId: string) => {
    return commentUrl.replace('{issueId}', issueId);
  };

  const createFields = (key: string, incident: Incident): Fields => {
    let fields: Fields = {
      summary: incident.summary,
      project: { key },
    };

    if (incident.issueType) {
      fields = { ...fields, issuetype: { name: incident.issueType } };
    }

    if (incident.description) {
      fields = { ...fields, description: incident.description };
    }

    if (incident.labels) {
      fields = { ...fields, labels: incident.labels };
    }

    if (incident.priority) {
      fields = { ...fields, priority: { name: incident.priority } };
    }

    return fields;
  };

  const createErrorMessage = (errors: ResponseError) => {
    return Object.entries(errors).reduce((errorMessage, [, value]) => {
      const msg = errorMessage.length > 0 ? `${errorMessage} ${value}` : value;
      return msg;
    }, '');
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
        getErrorMessage(
          i18n.NAME,
          `Unable to get incident with id ${id}. Error: ${
            error.message
          } Reason: ${createErrorMessage(error.response.data.errors)}`
        )
      );
    }
  };

  const findIncidents = async (params?: Record<string, string>) => {
    return undefined;
  };

  const createIncident = async ({
    incident,
  }: CreateIncidentParams): Promise<ExternalServiceIncidentResponse> => {
    // The response from Jira when creating an issue contains only the key and the id.
    // The function makes two calls when creating an issue. One to create the issue and one to get
    // the created issue with all the necessary fields.
    const createIssueMetadata = await getCreateIssueMetadata();
    const fields = createFields(projectKey, {
      ...incident,
      issueType: incident.issueType
        ? incident.issueType
        : createIssueMetadata.issueTypes[Object.keys(createIssueMetadata.issueTypes)[0]]?.name ??
          '',
    });

    try {
      const res = await request({
        axios: axiosInstance,
        url: `${incidentUrl}`,
        logger,
        method: 'post',
        data: {
          fields,
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
        getErrorMessage(
          i18n.NAME,
          `Unable to create incident. Error: ${error.message}. Reason: ${createErrorMessage(
            error.response.data.errors
          )}`
        )
      );
    }
  };

  const updateIncident = async ({ incidentId, incident }: ExternalServiceParams) => {
    try {
      await request({
        axios: axiosInstance,
        method: 'put',
        url: `${incidentUrl}/${incidentId}`,
        logger,
        data: { fields: { ...(incident as Record<string, unknown>) } },
        proxySettings,
      });

      const updatedIncident = await getIncident(incidentId as string);

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
          `Unable to update incident with id ${incidentId}. Error: ${
            error.message
          } Reason: ${createErrorMessage(error.response.data.errors)}`
        )
      );
    }
  };

  const createComment = async ({ incidentId, comment }: CreateCommentParams) => {
    try {
      const res = await request({
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
          `Unable to create comment at incident with id ${incidentId}. Error: ${
            error.message
          } Reason: ${createErrorMessage(error.response.data.errors)}`
        )
      );
    }
  };

  const getCreateIssueMetadata = async (): Promise<GetCreateIssueMetadataResponse> => {
    try {
      const capabilitiesResponse = await getCapabilities();

      const capabilities = Object.keys(capabilitiesResponse?.capabilities ?? {});
      const supportsNewAPI = createMetaCapabilities.every((c) => capabilities.includes(c));

      if (!supportsNewAPI) {
        const res = await request({
          axios: axiosInstance,
          method: 'get',
          url: createIssueMetadataUrl,
        });

        const issueTypes = res.data.projects[0]?.issuetypes ?? [];
        const metadata = issueTypes.reduce(
          (
            acc: Record<string, unknown>,
            currentIssueType: {
              name: string;
              id: string;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              fields: { [k: string]: { allowedValues?: any; defaultValue?: any } };
            }
          ) => {
            const fields = Object.keys(currentIssueType.fields ?? {}).reduce(
              (fieldsAcc, fieldKey) => {
                return {
                  ...fieldsAcc,
                  [fieldKey]: {
                    allowedValues: currentIssueType.fields[fieldKey]?.allowedValues ?? [],
                    defaultValue: currentIssueType.fields[fieldKey]?.defaultValue ?? {},
                  },
                };
              },
              {}
            );

            return {
              ...acc,
              [currentIssueType.name]: {
                id: currentIssueType.id,
                name: currentIssueType.name,
                fields,
              },
            };
          },
          {}
        );

        return { issueTypes: metadata };
      }

      return { issueTypes: {} };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to get create issue metadata. Error: ${
            error.message
          } Reason: ${createErrorMessage(error.response.data.errors)}`
        )
      );
    }
  };

  const getCapabilities = async () => {
    try {
      const res = await request({
        axios: axiosInstance,
        method: 'get',
        url: capabilitiesUrl,
      });

      return { ...res.data };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to get capabilities. Error: ${error.message} Reason: ${createErrorMessage(
            error.response.data.errors
          )}`
        )
      );
    }
  };

  return {
    getIncident,
    createIncident,
    updateIncident,
    createComment,
    findIncidents,
    getCreateIssueMetadata,
    getCapabilities,
  };
};
