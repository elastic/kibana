/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOG_SOURCE_CONFIGURATION_PATH_PREFIX = '/api/infra/log_source_configurations';
export const LOG_SOURCE_CONFIGURATION_PATH = `${LOG_SOURCE_CONFIGURATION_PATH_PREFIX}/{sourceId}`;
export const getLogSourceConfigurationPath = (sourceId: string) =>
  `${LOG_SOURCE_CONFIGURATION_PATH_PREFIX}/${sourceId}`;
