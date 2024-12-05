/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASES_CONNECTORS_CAPABILITY,
  CREATE_CASES_CAPABILITY,
  DELETE_CASES_CAPABILITY,
  PUSH_CASES_CAPABILITY,
  READ_CASES_CAPABILITY,
  UPDATE_CASES_CAPABILITY,
  CASES_SETTINGS_CAPABILITY,
  CASES_REOPEN_CAPABILITY,
  CREATE_COMMENT_CAPABILITY,
} from '../constants';

export interface CasesUiCapabilities {
  all: readonly string[];
  read: readonly string[];
  delete: readonly string[];
  settings: readonly string[];
  reopenCase: readonly string[];
  createComment: readonly string[];
}
/**
 * Return the UI capabilities for each type of operation. These strings must match the values defined in the UI
 * here: x-pack/plugins/cases/public/client/helpers/capabilities.ts
 */
export const createUICapabilities = (): CasesUiCapabilities => ({
  all: [
    CREATE_CASES_CAPABILITY,
    READ_CASES_CAPABILITY,
    UPDATE_CASES_CAPABILITY,
    PUSH_CASES_CAPABILITY,
    CASES_CONNECTORS_CAPABILITY,
  ] as const,
  read: [READ_CASES_CAPABILITY, CASES_CONNECTORS_CAPABILITY] as const,
  delete: [DELETE_CASES_CAPABILITY] as const,
  settings: [CASES_SETTINGS_CAPABILITY] as const,
  reopenCase: [CASES_REOPEN_CAPABILITY] as const,
  createComment: [CREATE_COMMENT_CAPABILITY] as const,
});
