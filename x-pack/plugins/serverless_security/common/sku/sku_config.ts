/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureKeys } from '@kbn/security-solution-plugin/common';
import type { ServerlessSecuritySku } from '../config';

export const SKU_APP_FEATURES: Record<ServerlessSecuritySku, AppFeatureKeys> = {
  endpointEssentials: {
    cases_base: false,
    rules_load_prepackaged: false,
    rules_response_actions: false,
    isolate_host: false,
  },

  cloudEssentials: {
    cases_base: true,
    rules_load_prepackaged: true,
    rules_response_actions: true,
    isolate_host: true,
  },
} as const;
