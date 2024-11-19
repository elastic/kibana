/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import {
  ConnectorUsageCollector,
  ConnectorTokenClientContract,
} from '@kbn/actions-plugin/server/types';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { ExternalService, ExternalServiceCredentials, SNProductsConfigValue } from './types';

import { ServiceNowPublicConfigurationType, ServiceFactory } from './types';
import { getAxiosInstance } from './utils';

interface CreateServiceWrapperOpts<T = ExternalService> {
  connectorId: string;
  credentials: ExternalServiceCredentials;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  serviceConfig: SNProductsConfigValue;
  connectorTokenClient: ConnectorTokenClientContract;
  createServiceFn: ServiceFactory<T>;
  connectorUsageCollector: ConnectorUsageCollector;
}

export function createServiceWrapper<T = ExternalService>({
  connectorId,
  credentials,
  logger,
  configurationUtilities,
  serviceConfig,
  connectorTokenClient,
  createServiceFn,
  connectorUsageCollector,
}: CreateServiceWrapperOpts<T>): T {
  const { config } = credentials;
  const { apiUrl: url } = config as ServiceNowPublicConfigurationType;
  const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
  const axiosInstance = getAxiosInstance({
    connectorId,
    logger,
    configurationUtilities,
    credentials,
    snServiceUrl: urlWithoutTrailingSlash,
    connectorTokenClient,
  });

  return createServiceFn({
    credentials,
    logger,
    configurationUtilities,
    serviceConfig,
    axiosInstance,
    connectorUsageCollector,
  });
}
