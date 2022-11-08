/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import axios from 'axios';

import { ActionsConfigurationUtilities } from '../../actions_config';
import { getErrorMessage, request, throwIfResponseIsNotValid } from '../lib/axios_utils';
import { getBodyForEventAction } from './helpers';
import {
  CreateCommentParams,
  CreateRecordParams,
  ExternalService,
  ExternalServiceCredentials,
  ExternalServiceIncidentResponse,
  MappingConfigType,
  ResponseError,
  SwimlanePublicConfigurationType,
  SwimlaneRecordPayload,
  SwimlaneSecretConfigurationType,
  UpdateRecordParams,
} from './types';
import * as i18n from './translations';

const createErrorMessage = (errorResponse: ResponseError | null | undefined): string => {
  if (errorResponse == null) {
    return 'unknown';
  }

  const { ErrorCode, Argument } = errorResponse;
  return Argument != null && ErrorCode != null ? `${Argument} (${ErrorCode})` : 'unknown';
};

export const createExternalService = (
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): ExternalService => {
  const { apiUrl: url, appId, mappings } = config as SwimlanePublicConfigurationType;
  const { apiToken } = secrets as SwimlaneSecretConfigurationType;

  const axiosInstance = axios.create();

  if (!url || !appId || !apiToken || !mappings) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Private-Token': `${secrets.apiToken}`,
  };

  const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
  const apiUrl = urlWithoutTrailingSlash.endsWith('api')
    ? urlWithoutTrailingSlash
    : urlWithoutTrailingSlash + '/api';

  const getPostRecordUrl = (id: string) => `${apiUrl}/app/${id}/record`;

  const getPostRecordIdUrl = (id: string, recordId: string) =>
    `${getPostRecordUrl(id)}/${recordId}`;

  const getRecordIdUrl = (id: string, recordId: string) =>
    `${urlWithoutTrailingSlash}/record/${id}/${recordId}`;

  const getPostCommentUrl = (id: string, recordId: string, commentFieldId: string) =>
    `${getPostRecordIdUrl(id, recordId)}/${commentFieldId}/comment`;

  const getCommentFieldId = (fieldMappings: MappingConfigType): string | null =>
    fieldMappings.commentsConfig?.id || null;

  const createRecord = async (
    params: CreateRecordParams
  ): Promise<ExternalServiceIncidentResponse> => {
    try {
      const mappingConfig = mappings as MappingConfigType;
      const data = getBodyForEventAction(appId, mappingConfig, params.incident);

      const res = await request({
        axios: axiosInstance,
        configurationUtilities,
        data,
        headers,
        logger,
        method: 'post',
        url: getPostRecordUrl(appId),
      });

      throwIfResponseIsNotValid({
        res,
        requiredAttributesToBeInTheResponse: ['id', 'name', 'createdDate'],
      });

      return {
        id: res.data.id,
        title: res.data.name,
        url: getRecordIdUrl(appId, res.data.id),
        pushedDate: new Date(res.data.createdDate).toISOString(),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to create record in application with id ${appId}. Status: ${
            error.response?.status ?? 500
          }. Error: ${error.message}. Reason: ${createErrorMessage(error.response?.data)}`
        )
      );
    }
  };

  const updateRecord = async (
    params: UpdateRecordParams
  ): Promise<ExternalServiceIncidentResponse> => {
    try {
      const mappingConfig = mappings as MappingConfigType;
      const data = getBodyForEventAction(appId, mappingConfig, params.incident, params.incidentId);

      const res = await request<SwimlaneRecordPayload>({
        axios: axiosInstance,
        configurationUtilities,
        data,
        headers,
        logger,
        method: 'patch',
        url: getPostRecordIdUrl(appId, params.incidentId),
      });

      throwIfResponseIsNotValid({
        res,
        requiredAttributesToBeInTheResponse: ['id', 'name', 'modifiedDate'],
      });

      return {
        id: res.data.id,
        title: res.data.name,
        url: getRecordIdUrl(appId, params.incidentId),
        pushedDate: new Date(res.data.modifiedDate).toISOString(),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to update record in application with id ${appId}. Status: ${
            error.response?.status ?? 500
          }. Error: ${error.message}. Reason: ${createErrorMessage(error.response?.data)}`
        )
      );
    }
  };

  const createComment = async ({ incidentId, comment, createdDate }: CreateCommentParams) => {
    try {
      const mappingConfig = mappings as MappingConfigType;
      const fieldId = getCommentFieldId(mappingConfig);

      if (fieldId == null) {
        throw new Error(`No comment field mapped in ${i18n.NAME} connector`);
      }

      const data = {
        createdDate,
        fieldId,
        isRichText: true,
        message: comment.comment,
      };

      await request({
        axios: axiosInstance,
        configurationUtilities,
        data,
        headers,
        logger,
        method: 'post',
        url: getPostCommentUrl(appId, incidentId, fieldId),
      });

      /**
       * Swimlane response does not contain any data.
       * We cannot get an externalCommentId
       */
      return {
        commentId: comment.commentId,
        pushedDate: createdDate,
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to create comment in application with id ${appId}. Status: ${
            error.response?.status ?? 500
          }. Error: ${error.message}. Reason: ${createErrorMessage(error.response?.data)}`
        )
      );
    }
  };

  return {
    createComment,
    createRecord,
    updateRecord,
  };
};
