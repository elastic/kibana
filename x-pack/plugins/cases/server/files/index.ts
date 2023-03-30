/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileJSON, FileKind } from '@kbn/files-plugin/common';
import type { FilesSetup } from '@kbn/files-plugin/server';
import {
  APP_ID,
  constructFileKindIdByOwner,
  constructFilesHttpOperationTag,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';
import type { Owner } from '../../common/constants/types';
import { HttpApiTagOperation } from '../../common/constants/types';
import { IMAGE_MIME_TYPES } from '../../common/constants/mime_types';
import type { FilesConfig } from './types';

const buildFileKind = (config: FilesConfig, owner: Owner): FileKind => {
  return {
    id: constructFileKindIdByOwner(owner),
    http: fileKindHttpTags(owner),
    maxSizeBytes: createMaxCallback(config),
    allowedMimeTypes: config.allowedMimeTypes,
  };
};

const fileKindHttpTags = (owner: Owner): FileKind['http'] => {
  return {
    create: buildTag(owner, HttpApiTagOperation.Create),
    delete: buildTag(owner, HttpApiTagOperation.Delete),
    download: buildTag(owner, HttpApiTagOperation.Read),
    getById: buildTag(owner, HttpApiTagOperation.Read),
    list: buildTag(owner, HttpApiTagOperation.Read),
  };
};

const access = 'access:';

const buildTag = (owner: Owner, operation: HttpApiTagOperation) => {
  return {
    tags: [`${access}${constructFilesHttpOperationTag(owner, operation)}`],
  };
};

export const createMaxCallback =
  (config: FilesConfig) =>
  (file: FileJSON): number => {
    const allowedMimeTypesSet = new Set(config.allowedMimeTypes);

    if (
      file.mimeType != null &&
      allowedMimeTypesSet.has(file.mimeType) &&
      IMAGE_MIME_TYPES.has(file.mimeType)
    ) {
      return config.maxImageSize;
    }

    return config.maxSize;
  };

/**
 * The file kind definition for interacting with the file service for the backend
 */
const createFileKinds = (config: FilesConfig): Record<Owner, FileKind> => {
  return {
    [APP_ID]: buildFileKind(config, APP_ID),
    [OBSERVABILITY_OWNER]: buildFileKind(config, OBSERVABILITY_OWNER),
    [SECURITY_SOLUTION_OWNER]: buildFileKind(config, SECURITY_SOLUTION_OWNER),
  };
};

export const registerCaseFileKinds = (config: FilesConfig, filesSetupPlugin: FilesSetup) => {
  const fileKinds = createFileKinds(config);

  for (const fileKind of Object.values(fileKinds)) {
    filesSetupPlugin.registerFileKind(fileKind);
  }
};

export const MAX_FILES_PER_CASE = 100;
