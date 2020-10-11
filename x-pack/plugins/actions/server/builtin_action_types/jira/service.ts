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
  CreateIncidentParams,
  UpdateIncidentParams,
  JiraPublicConfigurationType,
  JiraSecretConfigurationType,
  Fields,
  CreateCommentParams,
  Incident,
  ResponseError,
  ExternalServiceCommentResponse,
  ExternalServiceIncidentResponse,
} from './types';

import * as i18n from './translations';
import { request, getErrorMessage } from '../lib/axios_utils';
import { ProxySettings } from '../../types';

const VERSION = '2';
const BASE_URL = `rest/api/${VERSION}`;
const CAPABILITIES_URL = `rest/capabilities`;

const VIEW_INCIDENT_URL = `browse`;

const createMetaCapabilities = ['list-project-issuetypes', 'list-issuetype-fields'];

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

  const incidentUrl = `${url}/${BASE_URL}/issue`;
  const capabilitiesUrl = `${url}/${CAPABILITIES_URL}`;
  const commentUrl = `${incidentUrl}/{issueId}/comment`;
  const getIssueTypesOldAPIURL = `${url}/${BASE_URL}/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes.fields`;
  const getIssueTypeFieldsOldAPIURL = `${url}/${BASE_URL}/issue/createmeta?projectKeys=${projectKey}&issuetypeIds={issueTypeId}&expand=projects.issuetypes.fields`;
  const getIssueTypesUrl = `${url}/${BASE_URL}/issue/createmeta/${projectKey}/issuetypes`;
  const getIssueTypeFieldsUrl = `${url}/${BASE_URL}/issue/createmeta/${projectKey}/issuetypes/{issueTypeId}`;
  const searchUrl = `${url}/${BASE_URL}/search`;

  const axiosInstance = axios.create({
    auth: { username: email, password: apiToken },
  });

  const getIncidentViewURL = (key: string) => {
    return `${url}/${VIEW_INCIDENT_URL}/${key}`;
  };

  const getCommentsURL = (issueId: string) => {
    return commentUrl.replace('{issueId}', issueId);
  };
  const createGetIssueTypeFieldsUrl = (uri: string, issueTypeId: string) => {
    return uri.replace('{issueTypeId}', issueTypeId);
  };

  const createFields = (key: string, incident: Incident): Fields => {
    let fields: Fields = {
      summary: incident.summary,
      project: { key },
    };

    if (incident.issueType) {
      fields = { ...fields, issuetype: { id: incident.issueType } };
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

    if (incident.parent) {
      fields = { ...fields, parent: { key: incident.parent } };
    }

    return fields;
  };

  const createErrorMessage = (errorResponse: ResponseError | null | undefined): string => {
    if (errorResponse == null) {
      return '';
    }

    const { errorMessages, errors } = errorResponse;

    if (errors == null) {
      return '';
    }

    if (Array.isArray(errorMessages) && errorMessages.length > 0) {
      return `${errorMessages.join(', ')}`;
    }

    return Object.entries(errors).reduce((errorMessage, [, value]) => {
      const msg = errorMessage.length > 0 ? `${errorMessage} ${value}` : value;
      return msg;
    }, '');
  };

  const hasSupportForNewAPI = (capabilities: { capabilities?: {} }) =>
    createMetaCapabilities.every((c) => Object.keys(capabilities?.capabilities ?? {}).includes(c));

  const normalizeIssueTypes = (issueTypes: Array<{ id: string; name: string }>) =>
    issueTypes.map((type) => ({ id: type.id, name: type.name }));

  const normalizeFields = (fields: {
    [key: string]: { allowedValues?: Array<{}>; defaultValue?: {} };
  }) =>
    Object.keys(fields ?? {}).reduce((fieldsAcc, fieldKey) => {
      return {
        ...fieldsAcc,
        [fieldKey]: {
          allowedValues: fields[fieldKey]?.allowedValues ?? [],
          defaultValue: fields[fieldKey]?.defaultValue ?? {},
        },
      };
    }, {});

  const normalizeSearchResults = (
    issues: Array<{ id: string; key: string; fields: { summary: string } }>
  ) =>
    issues.map((issue) => ({ id: issue.id, key: issue.key, title: issue.fields?.summary ?? null }));

  const normalizeIssue = (issue: { id: string; key: string; fields: { summary: string } }) => ({
    id: issue.id,
    key: issue.key,
    title: issue.fields?.summary ?? null,
  });

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
          } Reason: ${createErrorMessage(error.response?.data)}`
        )
      );
    }
  };

  const createIncident = async ({
    incident,
  }: CreateIncidentParams): Promise<ExternalServiceIncidentResponse> => {
    /* The response from Jira when creating an issue contains only the key and the id.
      The function makes the following calls when creating an issue:
        1. Get issueTypes to set a default ONLY when incident.issueType is missing
        2. Create the issue.
        3. Get the created issue with all the necessary fields.
    */

    let issueType = incident.issueType;

    if (!incident.issueType) {
      const issueTypes = await getIssueTypes();
      issueType = issueTypes[0]?.id ?? '';
    }

    const fields = createFields(projectKey, {
      ...incident,
      issueType,
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
            error.response?.data
          )}`
        )
      );
    }
  };

  const updateIncident = async ({
    incidentId,
    incident,
  }: UpdateIncidentParams): Promise<ExternalServiceIncidentResponse> => {
    const incidentWithoutNullValues = Object.entries(incident).reduce(
      (obj, [key, value]) => (value != null ? { ...obj, [key]: value } : obj),
      {} as Incident
    );

    const fields = createFields(projectKey, incidentWithoutNullValues);

    try {
      await request({
        axios: axiosInstance,
        method: 'put',
        url: `${incidentUrl}/${incidentId}`,
        logger,
        data: { fields },
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
          }. Reason: ${createErrorMessage(error.response?.data)}`
        )
      );
    }
  };

  const createComment = async ({
    incidentId,
    comment,
  }: CreateCommentParams): Promise<ExternalServiceCommentResponse> => {
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
          }. Reason: ${createErrorMessage(error.response?.data)}`
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
        logger,
        proxySettings,
      });

      return { ...res.data };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to get capabilities. Error: ${error.message}. Reason: ${createErrorMessage(
            error.response?.data
          )}`
        )
      );
    }
  };

  const getIssueTypes = async () => {
    const capabilitiesResponse = await getCapabilities();
    const supportsNewAPI = hasSupportForNewAPI(capabilitiesResponse);

    try {
      if (!supportsNewAPI) {
        const res = await request({
          axios: axiosInstance,
          method: 'get',
          url: getIssueTypesOldAPIURL,
          logger,
          proxySettings,
        });

        const issueTypes = res.data.projects[0]?.issuetypes ?? [];
        return normalizeIssueTypes(issueTypes);
      } else {
        const res = await request({
          axios: axiosInstance,
          method: 'get',
          url: getIssueTypesUrl,
          logger,
          proxySettings,
        });

        const issueTypes = res.data.values;
        return normalizeIssueTypes(issueTypes);
      }
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to get issue types. Error: ${error.message}. Reason: ${createErrorMessage(
            error.response?.data
          )}`
        )
      );
    }
  };

  const getFieldsByIssueType = async (issueTypeId: string) => {
    const capabilitiesResponse = await getCapabilities();
    const supportsNewAPI = hasSupportForNewAPI(capabilitiesResponse);

    try {
      if (!supportsNewAPI) {
        const res = await request({
          axios: axiosInstance,
          method: 'get',
          url: createGetIssueTypeFieldsUrl(getIssueTypeFieldsOldAPIURL, issueTypeId),
          logger,
          proxySettings,
        });

        const fields = res.data.projects[0]?.issuetypes[0]?.fields || {};
        return normalizeFields(fields);
      } else {
        const res = await request({
          axios: axiosInstance,
          method: 'get',
          url: createGetIssueTypeFieldsUrl(getIssueTypeFieldsUrl, issueTypeId),
          logger,
          proxySettings,
        });

        const fields = res.data.values.reduce(
          (acc: { [x: string]: {} }, value: { fieldId: string }) => ({
            ...acc,
            [value.fieldId]: { ...value },
          }),
          {}
        );
        return normalizeFields(fields);
      }
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to get fields. Error: ${error.message}. Reason: ${createErrorMessage(
            error.response?.data
          )}`
        )
      );
    }
  };

  const getIssues = async (title: string) => {
    const query = `${searchUrl}?jql=${encodeURIComponent(
      `project="${projectKey}" and summary ~"${title}"`
    )}`;

    try {
      const res = await request({
        axios: axiosInstance,
        method: 'get',
        url: query,
        logger,
        proxySettings,
      });

      return normalizeSearchResults(res.data?.issues ?? []);
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to get issues. Error: ${error.message}. Reason: ${createErrorMessage(
            error.response?.data
          )}`
        )
      );
    }
  };

  const getIssue = async (id: string) => {
    const getIssueUrl = `${incidentUrl}/${id}`;
    try {
      const res = await request({
        axios: axiosInstance,
        method: 'get',
        url: getIssueUrl,
        logger,
        proxySettings,
      });

      return normalizeIssue(res.data ?? {});
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to get issue with id ${id}. Error: ${error.message}. Reason: ${createErrorMessage(
            error.response?.data
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
    getCapabilities,
    getIssueTypes,
    getFieldsByIssueType,
    getIssues,
    getIssue,
  };
};
