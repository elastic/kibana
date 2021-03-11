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
} from './types';
import * as i18n from './translations';
import { getErrorMessage, request } from '../lib/axios_utils';
// import { ActionsConfigurationUtilities } from '../../actions_config';
import { getBodyForEventAction } from './helpers';

export const createExternalService = (
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  // configurationUtilities: ActionsConfigurationUtilities,
  proxySettings?: ProxySettings
): ExternalService => {
  const { apiUrl: url, appId, mappings } = config as SwimlanePublicConfigurationType;
  const { apiToken } = secrets as SwimlaneSecretConfigurationType;

  const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
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
  const recordUrl = `${apiUrl}/app/{appId}/record`;
  const getPostRecordUrl = (id: string) => recordUrl.replace('{appId}', id);

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
        // configurationUtilities,
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
  };
};
