/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  ENDPOINT_CONFIG_PRESET_EDR_COMPLETE,
  ENDPOINT_CONFIG_PRESET_EDR_ESSENTIAL,
  ENDPOINT_CONFIG_PRESET_NGAV,
} from '../constants';
import type {
  AnyPolicyCreateConfig,
  PolicyCreateCloudConfig,
  PolicyCreateEndpointConfig,
} from '../types';

// The `statusCode` is used by Fleet API handler to ensure that the proper HTTP code is used in the API response
type THROW_ERROR = Error & { statusCode?: number };

const throwError = (message: string): never => {
  const error: THROW_ERROR = new Error(message);
  error.statusCode = 403;
  throw error;
};

const validateEndpointIntegrationConfig = (
  config: PolicyCreateEndpointConfig,
  logger: Logger
): void => {
  if (!config?.endpointConfig?.preset) {
    logger.warn('missing endpointConfig preset');
    throwError('invalid endpointConfig preset');
  }
  if (
    ![
      ENDPOINT_CONFIG_PRESET_NGAV,
      ENDPOINT_CONFIG_PRESET_EDR_COMPLETE,
      ENDPOINT_CONFIG_PRESET_EDR_ESSENTIAL,
    ].includes(config.endpointConfig.preset)
  ) {
    logger.warn(`invalid endpointConfig preset: ${config.endpointConfig.preset}`);
    throwError('invalid endpointConfig preset');
  }
};
const validateCloudIntegrationConfig = (config: PolicyCreateCloudConfig, logger: Logger): void => {
  if (!config?.eventFilters) {
    logger.warn(
      `eventFilters is required for cloud integration: {eventFilters : nonInteractiveSession: true / false}`
    );
    throwError('eventFilters is required for cloud integration');
  }
  if (typeof config.eventFilters?.nonInteractiveSession !== 'boolean') {
    logger.warn(
      `missing or invalid value for eventFilters nonInteractiveSession: ${config.eventFilters?.nonInteractiveSession}`
    );
    throwError('invalid value for eventFilters nonInteractiveSession');
  }
};

export const validateIntegrationConfig = (config: AnyPolicyCreateConfig, logger: Logger): void => {
  if (config.type === 'endpoint') {
    validateEndpointIntegrationConfig(config, logger);
  } else if (config.type === 'cloud') {
    validateCloudIntegrationConfig(config, logger);
  } else {
    logger.warn(`Invalid integration config type ${config}`);
    throwError('Invalid integration config type');
  }
};
