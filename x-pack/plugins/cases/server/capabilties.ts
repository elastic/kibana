/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Return the UI capabilities for each type of operation. These strings must match the values defined in the UI
 * here: x-pack/plugins/cases/public/client/helpers/capabilities.ts
 */
export const createUICapabilities = () => ({
  all: ['create_cases', 'read_cases', 'update_cases'] as const,
  read: ['read_cases'] as const,
  delete: ['delete_cases'] as const,
});
