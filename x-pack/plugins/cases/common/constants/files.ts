/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileKind } from '@kbn/files-plugin/common';
import { APP_ID } from './application';
import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from './owners';
import { Operation } from './types';
import type { Owner } from './types';
import { ALLOWED_MIME_TYPES } from './mime_types';

const buildFileKind = (owner: Owner): FileKind => {
  return {
    id: owner,
    http: fileKindHttpTags(owner),
    maxSizeBytes: maxFileSize,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  };
};

const fileKindHttpTags = (owner: Owner) => {
  return {
    create: buildTag(owner, Operation.Create),
    delete: buildTag(owner, Operation.Delete),
    download: buildTag(owner, Operation.Read),
    getById: buildTag(owner, Operation.Read),
    list: buildTag(owner, Operation.Read),
    update: buildTag(owner, Operation.Update),
  };
};

const buildTag = (owner: Owner, operation: Operation) => {
  return {
    tags: [`${access}${constructHttpOperationTag(owner, operation)}`],
  };
};

const access = 'access:';

const maxFileSize = 100 * 1024 * 1024; // 100 MiB

export const constructHttpOperationTag = (owner: Owner, operation: Operation) => {
  return `${owner}FilesCases${operation}`;
};

/**
 * The file kind definition for interacting with the file service
 */
export const CASES_FILE_KINDS: Record<Owner, FileKind> = {
  [APP_ID]: buildFileKind(APP_ID),
  [SECURITY_SOLUTION_OWNER]: buildFileKind(SECURITY_SOLUTION_OWNER),
  [OBSERVABILITY_OWNER]: buildFileKind(OBSERVABILITY_OWNER),
};
