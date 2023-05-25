/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppFeatureKey, AppFeatureKeys } from '@kbn/security-solution-plugin/common';
import type { ServerlessSecurityPLI } from '../config';

export const PLI_APP_FEATURES: Record<ServerlessSecurityPLI, AppFeatureKeys> = {
  endpointEssentials: {
    [AppFeatureKey.casesBase]: false,
    [AppFeatureKey.rulesLoadPrepackaged]: false,
    [AppFeatureKey.rulesResponseActions]: false,
  },

  cloudEssentials: {
    [AppFeatureKey.casesBase]: true,
    [AppFeatureKey.rulesLoadPrepackaged]: true,
    [AppFeatureKey.rulesResponseActions]: true,
  },
} as const;
