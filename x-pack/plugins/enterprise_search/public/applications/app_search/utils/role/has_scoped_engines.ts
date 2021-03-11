/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleTypes } from './types';

/**
 * Small utility helper for determining if a given role can have scoped engines
 */
export const roleHasScopedEngines = (roleType: RoleTypes): boolean => {
  const unscopedRoles = ['dev', 'editor', 'analyst'];
  return unscopedRoles.includes(roleType);
};
