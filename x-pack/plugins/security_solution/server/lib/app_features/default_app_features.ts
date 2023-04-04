/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureKeys } from '../../../common';

// DEFAULT_APP_FEATURES should be enabled all appFeatures by default. Authorization is handled by the Kibana role-based privileges.
// Different distributions can disable appFeatures by using the setAppFeatures() method exposed in the plugin setup contract.
export const DEFAULT_APP_FEATURES: AppFeatureKeys = {
  cases_base: true,
  rules_load_prepackaged: true,
  rules_response_actions: true,
};
