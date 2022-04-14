/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios, { AxiosRequestConfig } from 'axios';

import {
  ExternalServiceCredentials,
  SNProductsConfigValue,
  ServiceFactory,
  ExternalServiceITOM,
  ExecutorSubActionAddEventParams,
} from './types';

import { Logger } from '../../../../../../src/core/server';
import { ServiceNowSecretConfigurationType } from './types';
import { request } from '../lib/axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { createExternalService } from './service';
import { createServiceError, getAccessToken } from './utils';
import { ConnectorTokenClientContract } from '../../types';

const getAddEventURL = (url: string) => `${url}/api/global/em/jsonv2`;

export const createExternalServiceITOM: ServiceFactory<ExternalServiceITOM> = (
  connectorId: string,
  credentials: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  serviceConfig: SNProductsConfigValue,
  connectorTokenClient: ConnectorTokenClientContract
): ExternalServiceITOM => {
  const snService = createExternalService(
    connectorId,
    credentials,
    logger,
    configurationUtilities,
    serviceConfig,
    connectorTokenClient
  );

  const { isOAuth } = credentials.config;

  const { username, password } = credentials.secrets as ServiceNowSecretConfigurationType;
  let axiosInstance = axios.create();

  if (!isOAuth && username && password) {
    axiosInstance = axios.create({
      auth: { username, password },
    });
  } else {
    axiosInstance.interceptors.request.use(
      async (config: AxiosRequestConfig) => {
        const accessToken = await getAccessToken(
          connectorId,
          logger,
          configurationUtilities,
          credentials,
          snService.getUrl(),
          connectorTokenClient
        );
        config.headers.Authorization = accessToken;
        return config;
      },
      (error) => {
        Promise.reject(error);
      }
    );
  }

  const addEvent = async (params: ExecutorSubActionAddEventParams) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: getAddEventURL(snService.getUrl()),
        logger,
        method: 'post',
        data: { records: [params] },
        configurationUtilities,
      });

      snService.checkInstance(res);
    } catch (error) {
      throw createServiceError(error, `Unable to add event`);
    }
  };

  return {
    addEvent,
    getChoices: snService.getChoices,
  };
};
