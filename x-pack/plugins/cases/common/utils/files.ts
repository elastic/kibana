/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileKind } from '@kbn/files-plugin/common';
import { CASES_FILE_KINDS } from '../constants';

type RegisterFileKind = (fileKind: FileKind) => void;

export const registerCasesFileKinds = (registerFunction: RegisterFileKind) => {
  for (const fileKind of Object.values(CASES_FILE_KINDS)) {
    registerFunction(fileKind);
  }
};
