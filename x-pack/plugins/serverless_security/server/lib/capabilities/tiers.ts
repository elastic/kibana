/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TIER_CAPABILITIES = {
  endpointEssentials: {
    siem: {
      show: true,
      crud: false,
      prebuilt_rules: false,
    },
    securitySolutionCases: {
      create_cases: false,
      read_cases: false,
      update_cases: false,
      push_cases: false,
      delete_cases: false,
    },
  },

  cloudEssentials: {
    siem: {
      show: true,
      crud: true,
      prebuilt_rules: true,
    },
    securitySolutionCases: {
      create_cases: true,
      read_cases: true,
      update_cases: true,
      push_cases: true,
      delete_cases: true,
    },
  },
} as const;
