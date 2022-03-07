/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import {
  InternalArtifactSchema,
  InternalArtifactCompleteSchema,
  internalArtifactCompleteSchema,
} from '../../schemas/artifacts';

export const ArtifactConstants = {
  GLOBAL_ALLOWLIST_NAME: 'endpoint-exceptionlist',
  /**
   * Saved objects no longer used for storing artifacts
   * @deprecated
   */
  SAVED_OBJECT_TYPE: 'endpoint:user-artifact',
  SUPPORTED_OPERATING_SYSTEMS: ['macos', 'windows', 'linux'],
  SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS: ['macos', 'windows', 'linux'],
  GLOBAL_TRUSTED_APPS_NAME: 'endpoint-trustlist',

  SUPPORTED_EVENT_FILTERS_OPERATING_SYSTEMS: ['macos', 'windows', 'linux'],
  GLOBAL_EVENT_FILTERS_NAME: 'endpoint-eventfilterlist',

  SUPPORTED_HOST_ISOLATION_EXCEPTIONS_OPERATING_SYSTEMS: ['macos', 'windows', 'linux'],
  GLOBAL_HOST_ISOLATION_EXCEPTIONS_NAME: 'endpoint-hostisolationexceptionlist',

  SUPPORTED_BLOCKLISTS_OPERATING_SYSTEMS: ['macos', 'windows', 'linux'],
  GLOBAL_BLOCKLISTS_NAME: 'endpoint-blocklist',
};

export const ManifestConstants = {
  SAVED_OBJECT_TYPE: 'endpoint:user-artifact-manifest',
};

export const getArtifactId = (artifact: InternalArtifactSchema) => {
  return `${artifact.identifier}-${artifact.decodedSha256}`;
};

export const isCompleteArtifact = (
  artifact: InternalArtifactSchema
): artifact is InternalArtifactCompleteSchema => {
  return internalArtifactCompleteSchema.is(artifact);
};

export const reportErrors = (logger: Logger, errors: Error[]) => {
  errors.forEach((err) => {
    logger.error(err);
  });
};
