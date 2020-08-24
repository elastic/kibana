/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'src/core/server';
import {
  InternalArtifactSchema,
  InternalArtifactCompleteSchema,
  internalArtifactCompleteSchema,
} from '../../schemas/artifacts';

export const ArtifactConstants = {
  GLOBAL_ALLOWLIST_NAME: 'endpoint-exceptionlist',
  SAVED_OBJECT_TYPE: 'endpoint:user-artifact',
  SUPPORTED_OPERATING_SYSTEMS: ['macos', 'windows'],
  SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS: ['macos', 'windows', 'linux'],
  GLOBAL_TRUSTED_APPS_NAME: 'endpoint-trustlist',
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
