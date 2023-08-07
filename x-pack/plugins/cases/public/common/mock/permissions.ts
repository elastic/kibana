/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesCapabilities, CasesPermissions } from '../../containers/types';

export const allCasesPermissions = () => buildCasesPermissions();
export const noCasesPermissions = () =>
  buildCasesPermissions({ read: false, create: false, update: false, delete: false, push: false });
export const readCasesPermissions = () =>
  buildCasesPermissions({ read: true, create: false, update: false, delete: false, push: false });
export const noCreateCasesPermissions = () => buildCasesPermissions({ create: false });
export const noUpdateCasesPermissions = () => buildCasesPermissions({ update: false });
export const noPushCasesPermissions = () => buildCasesPermissions({ push: false });
export const noDeleteCasesPermissions = () => buildCasesPermissions({ delete: false });
export const writeCasesPermissions = () => buildCasesPermissions({ read: false });
export const onlyDeleteCasesPermission = () =>
  buildCasesPermissions({ read: false, create: false, update: false, delete: true, push: false });

export const buildCasesPermissions = (overrides: Partial<Omit<CasesPermissions, 'all'>> = {}) => {
  const create = overrides.create ?? true;
  const read = overrides.read ?? true;
  const update = overrides.update ?? true;
  const deletePermissions = overrides.delete ?? true;
  const push = overrides.push ?? true;
  const all = create && read && update && deletePermissions && push;

  return {
    all,
    create,
    read,
    update,
    delete: deletePermissions,
    push,
  };
};

export const allCasesCapabilities = () => buildCasesCapabilities();
export const noCasesCapabilities = () =>
  buildCasesCapabilities({
    create_cases: false,
    read_cases: false,
    update_cases: false,
    delete_cases: false,
    push_cases: false,
  });
export const readCasesCapabilities = () =>
  buildCasesCapabilities({
    create_cases: false,
    update_cases: false,
    delete_cases: false,
    push_cases: false,
  });
export const writeCasesCapabilities = () => {
  return buildCasesCapabilities({
    read_cases: false,
  });
};

export const buildCasesCapabilities = (overrides?: Partial<CasesCapabilities>) => {
  return {
    create_cases: overrides?.create_cases ?? true,
    read_cases: overrides?.read_cases ?? true,
    update_cases: overrides?.update_cases ?? true,
    delete_cases: overrides?.delete_cases ?? true,
    push_cases: overrides?.push_cases ?? true,
  };
};
