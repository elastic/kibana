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
  constructFilesHttpOperationTag,
  MAX_FILE_SIZE,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';
import type { Owner } from '../../common/constants/types';
import { HttpApiTagOperation } from '../../common/constants/types';
import { ALLOWED_MIME_TYPES, IMAGE_MIME_TYPES } from '../../common/constants/mime_types';

const buildFileKind = (owner: Owner): FileKind => {
  return {
    id: owner,
    http: fileKindHttpTags(owner),
    maxSizeBytes,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
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

const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB

const maxSizeBytes = (file: FileJSON): number => {
  if (file.mimeType != null && IMAGE_MIME_TYPES.has(file.mimeType)) {
    return MAX_IMAGE_FILE_SIZE;
  }

  return MAX_FILE_SIZE;
};

/**
 * The file kind definition for interacting with the file service for the backend
 */
const CASES_FILE_KINDS: Record<Owner, FileKind> = {
  [APP_ID]: buildFileKind(APP_ID),
  [SECURITY_SOLUTION_OWNER]: buildFileKind(SECURITY_SOLUTION_OWNER),
  [OBSERVABILITY_OWNER]: buildFileKind(OBSERVABILITY_OWNER),
};

export const registerCaseFileKinds = (filesSetupPlugin: FilesSetup) => {
  for (const fileKind of Object.values(CASES_FILE_KINDS)) {
    filesSetupPlugin.registerFileKind(fileKind);
  }
};
