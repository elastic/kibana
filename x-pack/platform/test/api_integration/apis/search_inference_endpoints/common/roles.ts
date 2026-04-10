/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from './types';

export const inferenceSettingsAllRole: Role = {
  name: 'inference_settings_test_all',
  privileges: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ],
  },
};

export const inferenceSettingsFeatureRole: Role = {
  name: 'inference_settings_test_feature',
  privileges: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        feature: {
          searchInferenceEndpoints: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const inferenceSettingsNoAccessRole: Role = {
  name: 'inference_settings_test_no_access',
  privileges: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        feature: {
          discover: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const ROLES = {
  ALL: inferenceSettingsAllRole,
  FEATURE: inferenceSettingsFeatureRole,
  NO_ACCESS: inferenceSettingsNoAccessRole,
};

export const ALL_ROLES = Object.values(ROLES);
