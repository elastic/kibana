/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const noCasesCapabilities = () => ({
  create_cases: false,
  read_cases: false,
  update_cases: false,
  delete_cases: false,
  push_cases: false,
});

export const readCasesCapabilities = () => ({
  create_cases: false,
  read_cases: true,
  update_cases: false,
  delete_cases: false,
  push_cases: false,
});

export const allCasesCapabilities = () => ({
  create_cases: true,
  read_cases: true,
  update_cases: true,
  delete_cases: true,
  push_cases: true,
});

export const noCasesPermissions = () => ({
  all: false,
  create: false,
  read: false,
  update: false,
  delete: false,
  push: false,
});

export const readCasesPermissions = () => ({
  all: false,
  create: false,
  read: true,
  update: false,
  delete: false,
  push: false,
});

export const writeCasesPermissions = () => ({
  all: false,
  create: true,
  read: false,
  update: true,
  delete: true,
  push: true,
});

export const allCasesPermissions = () => ({
  all: true,
  create: true,
  read: true,
  update: true,
  delete: true,
  push: true,
});
