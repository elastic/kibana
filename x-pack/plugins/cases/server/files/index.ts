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
  MAX_FILE_SIZE,
  MAX_IMAGE_FILE_SIZE,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';
import type { Owner } from '../../common/constants/types';
import { HttpApiTagOperation } from '../../common/constants/types';
import { IMAGE_MIME_TYPES } from '../../common/constants/mime_types';
import type { FilesConfig } from './types';
import { constructFileKindIdByOwner, constructFilesHttpOperationTag } from '../../common/files';

const buildFileKind = (config: FilesConfig, owner: Owner): FileKind => {
  return {
    id: constructFileKindIdByOwner(owner),
    http: fileKindHttpTags(owner),
    maxSizeBytes: createMaxCallback(config),
    allowedMimeTypes: config.allowedMimeTypes,
    hashes: ['md5', 'sha1', 'sha256'],
  };
};

const fileKindHttpTags = (owner: Owner): FileKind['http'] => {
  return {
    create: buildTag(owner, HttpApiTagOperation.Create),
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
    // if the user set a max size, always return that
    if (config.maxSize != null) {
      return config.maxSize;
    }

    const allowedMimeTypesSet = new Set(config.allowedMimeTypes);

    // if we have the mime type for the file and it exists within the allowed types and it is an image then return the
    // image size
    if (
      file.mimeType != null &&
      allowedMimeTypesSet.has(file.mimeType) &&
      IMAGE_MIME_TYPES.has(file.mimeType)
    ) {
      return MAX_IMAGE_FILE_SIZE;
    }

    return MAX_FILE_SIZE;
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
