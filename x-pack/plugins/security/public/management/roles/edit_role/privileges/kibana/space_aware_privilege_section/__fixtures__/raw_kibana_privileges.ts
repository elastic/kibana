/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawKibanaPrivileges } from '../../../../../../../../../common/model';

export const rawKibanaPrivileges: RawKibanaPrivileges = {
  global: {
    all: [
      'normal-feature-all',
      'normal-feature-read',
      'just-global-all',
      'all-privilege-excluded-from-base-read',
    ],
    read: ['normal-feature-read', 'all-privilege-excluded-from-base-read'],
  },
  space: {
    all: ['normal-feature-all', 'normal-feature-read', 'all-privilege-excluded-from-base-read'],
    read: ['normal-feature-read', 'all-privilege-excluded-from-base-read'],
  },
  reserved: {},
  features: {
    normal: {
      all: ['normal-feature-all', 'normal-feature-read'],
      read: ['normal-feature-read'],
    },
    bothPrivilegesExcludedFromBase: {
      all: ['both-privileges-excluded-from-base-all', 'both-privileges-excluded-from-base-read'],
      read: ['both-privileges-excluded-from-base-read'],
    },
    allPrivilegeExcludedFromBase: {
      all: ['all-privilege-excluded-from-base-all', 'all-privilege-excluded-from-base-read'],
      read: ['all-privilege-excluded-from-base-read'],
    },
  },
};
