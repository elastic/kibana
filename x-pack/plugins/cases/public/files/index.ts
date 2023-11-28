/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilesSetup } from '@kbn/files-plugin/public';
import type { FileKindBrowser } from '@kbn/shared-ux-file-types';
import {
  GENERAL_CASES_OWNER,
  MAX_FILE_SIZE,
  OBSERVABILITY_OWNER,
  OWNERS,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';
import type { Owner } from '../../common/constants/types';
import { constructFileKindIdByOwner } from '../../common/files';
import type { CaseFileKinds, FilesConfig } from './types';
import * as i18n from './translations';

const getOwnerUIName = (owner: Owner) => {
  switch (owner) {
    case SECURITY_SOLUTION_OWNER:
      return 'Security';
    case OBSERVABILITY_OWNER:
      return 'Observability';
    case GENERAL_CASES_OWNER:
      return 'Stack Management';
    default:
      return owner;
  }
};

const buildFileKind = (config: FilesConfig, owner: Owner): FileKindBrowser => {
  return {
    id: constructFileKindIdByOwner(owner),
    allowedMimeTypes: config.allowedMimeTypes,
    maxSizeBytes: config.maxSize ?? MAX_FILE_SIZE,
    managementUiActions: {
      delete: {
        enabled: false,
        reason: i18n.FILE_DELETE_REASON(getOwnerUIName(owner)),
      },
    },
  };
};

export const isRegisteredOwner = (ownerToCheck: string): ownerToCheck is Owner =>
  OWNERS.includes(ownerToCheck as Owner);

/**
 * The file kind definition for interacting with the file service for the UI
 */
const createFileKinds = (config: FilesConfig): CaseFileKinds => {
  const caseFileKinds = new Map<Owner, FileKindBrowser>();

  for (const owner of OWNERS) {
    caseFileKinds.set(owner, buildFileKind(config, owner));
  }

  return caseFileKinds;
};

export const registerCaseFileKinds = (config: FilesConfig, filesSetupPlugin: FilesSetup) => {
  const fileKinds = createFileKinds(config);

  for (const fileKind of fileKinds.values()) {
    filesSetupPlugin.registerFileKind(fileKind);
  }
};
