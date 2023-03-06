/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilesSetup } from '@kbn/files-plugin/public';
import type { FileKindBrowser } from '@kbn/shared-ux-file-types';
import { ALLOWED_MIME_TYPES } from '../../common/constants/mime_types';
import { MAX_FILE_SIZE } from '../../common/constants';
import type { Owner } from '../../common/constants/types';
import { APP_ID, OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../common';

const buildFileKind = (owner: Owner): FileKindBrowser => {
  return {
    id: owner,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    maxSizeBytes: MAX_FILE_SIZE,
  };
};

/**
 * The file kind definition for interacting with the file service for the UI
 */
const CASES_FILE_KINDS: Record<Owner, FileKindBrowser> = {
  [APP_ID]: buildFileKind(APP_ID),
  [SECURITY_SOLUTION_OWNER]: buildFileKind(SECURITY_SOLUTION_OWNER),
  [OBSERVABILITY_OWNER]: buildFileKind(OBSERVABILITY_OWNER),
};

export const registerCaseFileKinds = (filesSetupPlugin: FilesSetup) => {
  for (const fileKind of Object.values(CASES_FILE_KINDS)) {
    filesSetupPlugin.registerFileKind(fileKind);
  }
};
