/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import {
  ServiceFactory,
  ExternalServiceITOM,
  ExecutorSubActionAddEventParams,
} from '../lib/servicenow/types';

import { createExternalService as createExternalServiceCommon } from '../lib/servicenow/service';
import { createServiceError } from '../lib/servicenow/utils';

const getAddEventURL = (url: string) => `${url}/api/global/em/jsonv2`;

export const createExternalService: ServiceFactory<ExternalServiceITOM> = ({
  credentials,
  logger,
  configurationUtilities,
  serviceConfig,
  axiosInstance,
}): ExternalServiceITOM => {
  const snService = createExternalServiceCommon({
    credentials,
    logger,
    configurationUtilities,
    serviceConfig,
    axiosInstance,
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
