/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';

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
import { createServiceError } from './utils';

const getAddEventURL = (url: string) => `${url}/api/global/em/jsonv2`;

export const createExternalServiceITOM: ServiceFactory<ExternalServiceITOM> = (
  credentials: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  serviceConfig: SNProductsConfigValue
): ExternalServiceITOM => {
  const snService = createExternalService(
    credentials,
    logger,
    configurationUtilities,
    serviceConfig
  );

  const { username, password } = credentials.secrets as ServiceNowSecretConfigurationType;
  const axiosInstance = axios.create({
    auth: { username, password },
  });

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
