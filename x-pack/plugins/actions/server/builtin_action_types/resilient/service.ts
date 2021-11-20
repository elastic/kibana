/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { omitBy, isNil } from 'lodash/fp';

import { Logger } from '../../../../../../src/core/server';
import {
  ExternalServiceCredentials,
  ExternalService,
  ExternalServiceParams,
  CreateCommentParams,
  UpdateIncidentParams,
  CreateIncidentParams,
  CreateIncidentData,
  ResilientPublicConfigurationType,
  ResilientSecretConfigurationType,
  UpdateIncidentRequest,
  GetValueTextContentResponse,
} from './types';

import * as i18n from './translations';
import { getErrorMessage, request, throwIfResponseIsNotValid } from '../lib/axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';

const VIEW_INCIDENT_URL = `#incidents`;

export const getValueTextContent = (
  field: string,
  value: string | number | number[]
): GetValueTextContentResponse => {
  if (field === 'description') {
    return {
      textarea: {
        format: 'html',
        content: value as string,
      },
    };
  }

  if (field === 'incidentTypes') {
    return {
      ids: value as number[],
    };
  }

  if (field === 'severityCode') {
    return {
      id: value as number,
    };
  }

  return {
    text: value as string,
  };
};

export const formatUpdateRequest = ({
  oldIncident,
  newIncident,
}: ExternalServiceParams): UpdateIncidentRequest => {
  return {
    changes: Object.keys(newIncident as Record<string, unknown>).map((key) => {
      let name = key;

      if (key === 'incidentTypes') {
        name = 'incident_type_ids';
      }

      if (key === 'severityCode') {
        name = 'severity_code';
      }

      return {
        field: { name },
        // TODO: Fix ugly casting
        old_value: getValueTextContent(
          key,
          (oldIncident as Record<string, unknown>)[name] as string
        ),
        new_value: getValueTextContent(
          key,
          (newIncident as Record<string, unknown>)[key] as string
        ),
      };
    }),
  };
};

export const createExternalService = (
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): ExternalService => {
  const { apiUrl: url, orgId } = config as ResilientPublicConfigurationType;
  const { apiKeyId, apiKeySecret } = secrets as ResilientSecretConfigurationType;

  if (!url || !orgId || !apiKeyId || !apiKeySecret) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
  const orgUrl = `${urlWithoutTrailingSlash}/rest/orgs/${orgId}`;
  const incidentUrl = `${orgUrl}/incidents`;
  const commentUrl = `${incidentUrl}/{inc_id}/comments`;
  const incidentFieldsUrl = `${orgUrl}/types/incident/fields`;
  const incidentTypesUrl = `${incidentFieldsUrl}/incident_type_ids`;
  const severityUrl = `${incidentFieldsUrl}/severity_code`;
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
        logger,
        params: {
          text_content_output_format: 'objects_convert',
        },
        configurationUtilities,
      });

      throwIfResponseIsNotValid({
        res,
      });

      return { ...res.data, description: res.data.description?.content ?? '' };
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to get incident with id ${id}. Error: ${error.message}.`)
      );
    }
  };

  const createIncident = async ({ incident }: CreateIncidentParams) => {
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

    try {
      const res = await request({
        axios: axiosInstance,
        url: `${incidentUrl}?text_content_output_format=objects_convert`,
        method: 'post',
        logger,
        data,
        configurationUtilities,
      });

      throwIfResponseIsNotValid({
        res,
        requiredAttributesToBeInTheResponse: ['id', 'create_date'],
      });

      return {
        title: `${res.data.id}`,
        id: `${res.data.id}`,
        pushedDate: new Date(res.data.create_date).toISOString(),
        url: getIncidentViewURL(res.data.id),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to create incident. Error: ${error.message}.`)
      );
    }
  };

  const updateIncident = async ({ incidentId, incident }: UpdateIncidentParams) => {
    try {
      const latestIncident = await getIncident(incidentId);

      // Remove null or undefined values. Allowing null values sets the field in IBM Resilient to empty.
      const newIncident = omitBy(isNil, incident);
      const data = formatUpdateRequest({ oldIncident: latestIncident, newIncident });

      const res = await request({
        axios: axiosInstance,
        method: 'patch',
        url: `${incidentUrl}/${incidentId}`,
        logger,
        data,
        configurationUtilities,
      });

      throwIfResponseIsNotValid({
        res,
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

  const createComment = async ({ incidentId, comment }: CreateCommentParams) => {
    try {
      const res = await request({
        axios: axiosInstance,
        method: 'post',
        url: getCommentsURL(incidentId),
        logger,
        data: { text: { format: 'text', content: comment.comment } },
        configurationUtilities,
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
        getErrorMessage(
          i18n.NAME,
          `Unable to create comment at incident with id ${incidentId}. Error: ${error.message}.`
        )
      );
    }
  };

  const getIncidentTypes = async () => {
    try {
      const res = await request({
        axios: axiosInstance,
        method: 'get',
        url: incidentTypesUrl,
        logger,
        configurationUtilities,
      });

      throwIfResponseIsNotValid({
        res,
      });

      const incidentTypes = res.data?.values ?? [];
      return incidentTypes.map((type: { value: string; label: string }) => ({
        id: type.value,
        name: type.label,
      }));
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to get incident types. Error: ${error.message}.`)
      );
    }
  };

  const getSeverity = async () => {
    try {
      const res = await request({
        axios: axiosInstance,
        method: 'get',
        url: severityUrl,
        logger,
        configurationUtilities,
      });

      throwIfResponseIsNotValid({
        res,
      });

      const incidentTypes = res.data?.values ?? [];
      return incidentTypes.map((type: { value: string; label: string }) => ({
        id: type.value,
        name: type.label,
      }));
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to get severity. Error: ${error.message}.`)
      );
    }
  };

  const getFields = async () => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: incidentFieldsUrl,
        logger,
        configurationUtilities,
      });

      throwIfResponseIsNotValid({
        res,
      });

      return res.data ?? [];
    } catch (error) {
      throw new Error(getErrorMessage(i18n.NAME, `Unable to get fields. Error: ${error.message}.`));
    }
  };

  return {
    createComment,
    createIncident,
    getFields,
    getIncident,
    getIncidentTypes,
    getSeverity,
    updateIncident,
  };
};
