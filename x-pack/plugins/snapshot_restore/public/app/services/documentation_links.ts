/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RepositoryDocPaths, RepositoryType, RepositoryTypes } from '../../../common/types';

export const getRepositoryTypeDocUrl = (
  type: RepositoryType,
  esDocBasePath: string,
  esPluginDocBasePath: string
): string => {
  switch (type) {
    case RepositoryTypes.fs:
      return `${esDocBasePath}${RepositoryDocPaths.fs}`;
    case RepositoryTypes.url:
      return `${esDocBasePath}${RepositoryDocPaths.url}`;
    case RepositoryTypes.source:
      return `${esDocBasePath}${RepositoryDocPaths.source}`;
    case RepositoryTypes.s3:
      return `${esPluginDocBasePath}${RepositoryDocPaths.s3}`;
    case RepositoryTypes.hdfs:
      return `${esPluginDocBasePath}${RepositoryDocPaths.hdfs}`;
    case RepositoryTypes.azure:
      return `${esPluginDocBasePath}${RepositoryDocPaths.azure}`;
    case RepositoryTypes.gcs:
      return `${esPluginDocBasePath}${RepositoryDocPaths.gcs}`;
    default:
      return `${esDocBasePath}${RepositoryDocPaths.default}`;
  }
};
