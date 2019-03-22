/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { REPOSITORY_TYPES } from '../../../../common/constants';
import { RepositoryType } from '../../../../common/types';
import { REPOSITORY_DOC_PATHS } from '../../constants';

export const getRepositoryTypeDocUrl = (
  type: RepositoryType,
  esDocBasePath: string,
  esPluginDocBasePath: string
): string => {
  switch (type) {
    case REPOSITORY_TYPES.fs:
      return `${esDocBasePath}${REPOSITORY_DOC_PATHS.fs}`;
    case REPOSITORY_TYPES.url:
      return `${esDocBasePath}${REPOSITORY_DOC_PATHS.url}`;
    case REPOSITORY_TYPES.source:
      return `${esDocBasePath}${REPOSITORY_DOC_PATHS.source}`;
    case REPOSITORY_TYPES.s3:
      return `${esPluginDocBasePath}${REPOSITORY_DOC_PATHS.s3}`;
    case REPOSITORY_TYPES.hdfs:
      return `${esPluginDocBasePath}${REPOSITORY_DOC_PATHS.hdfs}`;
    case REPOSITORY_TYPES.azure:
      return `${esPluginDocBasePath}${REPOSITORY_DOC_PATHS.azure}`;
    case REPOSITORY_TYPES.gcs:
      return `${esPluginDocBasePath}${REPOSITORY_DOC_PATHS.gcs}`;
    default:
      return `${esDocBasePath}${REPOSITORY_DOC_PATHS.default}`;
  }
};
