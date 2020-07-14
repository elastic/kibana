/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  adminMlCapabilities,
  userMlCapabilities,
  MlCapabilities,
  getDefaultCapabilities,
} from '../../../../common/types/capabilities';

export function getAdminCapabilities() {
  const caps: any = {};
  Object.keys(adminMlCapabilities).forEach((k) => {
    caps[k] = true;
  });
  return { ...getUserCapabilities(), ...caps } as MlCapabilities;
}

export function getUserCapabilities() {
  const caps: any = {};
  Object.keys(userMlCapabilities).forEach((k) => {
    caps[k] = true;
  });

  return { ...getDefaultCapabilities(), ...caps } as MlCapabilities;
}
