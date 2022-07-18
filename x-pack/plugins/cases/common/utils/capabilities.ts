/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CREATE_CASES_CAPABILITY,
  DELETE_CASES_CAPABILITY,
  PUSH_CASES_CAPABILITY,
  READ_CASES_CAPABILITY,
  UPDATE_CASES_CAPABILITY,
} from '../constants';

/**
 * Return the UI capabilities for each type of operation. These strings must match the values defined in the UI
 * here: x-pack/plugins/cases/public/client/helpers/capabilities.ts
 */
export const createUICapabilities = () => ({
  all: [
    CREATE_CASES_CAPABILITY,
    READ_CASES_CAPABILITY,
    UPDATE_CASES_CAPABILITY,
    PUSH_CASES_CAPABILITY,
  ] as const,
  read: [READ_CASES_CAPABILITY] as const,
  delete: [DELETE_CASES_CAPABILITY] as const,
});
