/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '@kbn/logging';
import axios from 'axios';
import https from 'https';
import { ProxySettings } from '../../types';
import {
  SwimlanePublicConfigurationType,
  ExternalService,
  ExternalServiceCredentials,
  CreateRecordParams,
  CreateRecordResponse,
  SwimlaneSecretConfigurationType,
  MappingConfigType,
  SwimlaneRecordPayload,
  GetApplicationResponse,
} from './types';
import * as i18n from './translations';
import { getErrorMessage, request } from '../lib/axios_utils';

export const createExternalService = (
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  proxySettings?: ProxySettings
): ExternalService => {
  const { apiUrl: url, appId, mappings } = config as SwimlanePublicConfigurationType;
  const { apiToken } = secrets as SwimlaneSecretConfigurationType;

  const axiosInstance = axios.create({
    httpsAgent: new https.Agent({}),
  });

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
  const applicationUrl = `${apiUrl}/app/{appId}`;
  const recordUrl = `${apiUrl}/app/{appId}/record`;
  const getApplicationUrl = (id: string) => applicationUrl.replace('{appId}', id);
  const getPostRecordUrl = (id: string) => recordUrl.replace('{appId}', id);

  const getBodyForEventAction = (
    applicationId: string,
    mappingConfig: MappingConfigType,
    params: CreateRecordParams
  ): SwimlaneRecordPayload => {
    const data: SwimlaneRecordPayload = {
      applicationId: appId,
    };

    const values: Record<string, unknown> = {};

    for (const mappingsKey in mappingConfig) {
      if (!Object.hasOwnProperty.call(mappingConfig, mappingsKey)) {
        continue;
      }

      const fieldMap = mappingConfig[mappingsKey];

      if (!fieldMap) {
        continue;
      }

      const { id, key } = fieldMap;
      const paramName = key.replace('KeyName', '');

      values[id] = params[paramName];
    }

    data.values = values;

    return data;
  };

  const getApplication = async (): Promise<GetApplicationResponse> => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: getApplicationUrl(appId),
        logger,
        proxySettings,
        headers,
      });

      return { ...(res?.data?.application ?? {}) };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to get application with id ${appId}. Error: ${error.message}`
        )
      );
    }
  };

  const createRecord = async (params: CreateRecordParams): Promise<CreateRecordResponse> => {
    try {
      const mappingConfig = mappings as MappingConfigType;
      const data = getBodyForEventAction(appId, mappingConfig, params);

      const res = await request({
        axios: axiosInstance,
        url: getPostRecordUrl(appId),
        logger,
        proxySettings,
        headers,
        method: 'post',
        data,
      });
      return { id: res.data.id };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to create record in application with id ${appId}. Error: ${error.message}`
        )
      );
    }
  };

  return {
    createRecord,
    application: getApplication,
  };
};
