/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'src/core/server';

export const ArtifactConstants = {
  GLOBAL_ALLOWLIST_NAME: 'endpoint-exceptionlist',
  SAVED_OBJECT_TYPE: 'endpoint:user-artifact',
  SUPPORTED_OPERATING_SYSTEMS: ['linux', 'macos', 'windows'],
  SCHEMA_VERSION: 'v1',
};

export const ManifestConstants = {
  SAVED_OBJECT_TYPE: 'endpoint:user-artifact-manifest',
  SCHEMA_VERSION: 'v1',
  INITIAL_VERSION: 'WzAsMF0=',
};

export const reportErrors = (logger: Logger, errors: Error[]) => {
  errors.forEach((err) => {
    logger.error(err);
  });
};
