/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilesSetup } from '@kbn/files-plugin/public';
import type { FileKindBrowser } from '@kbn/shared-ux-file-types';
import { ALLOWED_MIME_TYPES } from '../../common/constants/mime_types';
import { constructFileKindIdByOwner, MAX_FILE_SIZE } from '../../common/constants';
import type { Owner } from '../../common/constants/types';
import { APP_ID, OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../common';
import type { CaseFileKinds, FilesConfig } from './types';

const buildFileKind = (config: FilesConfig, owner: Owner): FileKindBrowser => {
  return {
    id: constructFileKindIdByOwner(owner),
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    maxSizeBytes: MAX_FILE_SIZE,
  };
};

/**
 * The file kind definition for interacting with the file service for the UI
 */
const createFileKinds = (config: FilesConfig): CaseFileKinds => {
  return {
    [APP_ID]: buildFileKind(config, APP_ID),
    [SECURITY_SOLUTION_OWNER]: buildFileKind(config, SECURITY_SOLUTION_OWNER),
    [OBSERVABILITY_OWNER]: buildFileKind(config, OBSERVABILITY_OWNER),
  };
};

export const registerCaseFileKinds = (
  config: FilesConfig,
  filesSetupPlugin: FilesSetup
): CaseFileKinds => {
  const fileKinds = createFileKinds(config);

  for (const fileKind of Object.values(fileKinds)) {
    filesSetupPlugin.registerFileKind(fileKind);
  }

  return fileKinds;
};
