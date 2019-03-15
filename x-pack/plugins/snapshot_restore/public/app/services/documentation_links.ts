/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  AzureRepositoryType,
  AzureRepositoryTypeDocPath,
  FSRepositoryType,
  FSRepositoryTypeDocPath,
  GCSRepositoryType,
  GCSRepositoryTypeDocPath,
  HDFSRepositoryType,
  HDFSRepositoryTypeDocPath,
  ReadonlyRepositoryType,
  ReadonlyRepositoryTypeDocPath,
  RepositoryType,
  RepositoryTypeDocPath,
  S3RepositoryType,
  S3RepositoryTypeDocPath,
  SourceRepositoryType,
  SourceRepositoryTypeDocPath,
} from '../../../common/repository_types';

export const getRepositoryTypeDocUrl = (
  type: RepositoryType,
  esDocBasePath: string,
  esPluginDocBasePath: string
): string => {
  switch (type) {
    case FSRepositoryType:
      return `${esDocBasePath}${FSRepositoryTypeDocPath}`;
    case ReadonlyRepositoryType:
      return `${esDocBasePath}${ReadonlyRepositoryTypeDocPath}`;
    case SourceRepositoryType:
      return `${esDocBasePath}${SourceRepositoryTypeDocPath}`;
    case S3RepositoryType:
      return `${esPluginDocBasePath}${S3RepositoryTypeDocPath}`;
    case HDFSRepositoryType:
      return `${esPluginDocBasePath}${HDFSRepositoryTypeDocPath}`;
    case AzureRepositoryType:
      return `${esPluginDocBasePath}${AzureRepositoryTypeDocPath}`;
    case GCSRepositoryType:
      return `${esPluginDocBasePath}${GCSRepositoryTypeDocPath}`;
    default:
      return `${esDocBasePath}${RepositoryTypeDocPath}`;
  }
};
