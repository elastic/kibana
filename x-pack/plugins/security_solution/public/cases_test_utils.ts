/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPermissions, CasesCapabilities } from '@kbn/cases-plugin/common';

export const noCasesCapabilities = (): CasesCapabilities => ({
  create_cases: false,
  read_cases: false,
  update_cases: false,
  delete_cases: false,
  push_cases: false,
  cases_connectors: false,
  cases_settings: false,
});

export const readCasesCapabilities = (): CasesCapabilities => ({
  create_cases: false,
  read_cases: true,
  update_cases: false,
  delete_cases: false,
  push_cases: false,
  cases_connectors: true,
  cases_settings: false,
});

export const allCasesCapabilities = (): CasesCapabilities => ({
  create_cases: true,
  read_cases: true,
  update_cases: true,
  delete_cases: true,
  push_cases: true,
  cases_connectors: true,
  cases_settings: true,
});

export const noCasesPermissions = (): CasesPermissions => ({
  all: false,
  create: false,
  read: false,
  update: false,
  delete: false,
  push: false,
  connectors: false,
  settings: false,
});

export const readCasesPermissions = (): CasesPermissions => ({
  all: false,
  create: false,
  read: true,
  update: false,
  delete: false,
  push: false,
  connectors: true,
  settings: false,
});

export const writeCasesPermissions = (): CasesPermissions => ({
  all: false,
  create: true,
  read: false,
  update: true,
  delete: true,
  push: true,
  connectors: true,
  settings: true,
});

export const allCasesPermissions = (): CasesPermissions => ({
  all: true,
  create: true,
  read: true,
  update: true,
  delete: true,
  push: true,
  connectors: true,
  settings: true,
});
