/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppFeatureKeys } from '@kbn/security-solution-plugin/common';

export const DEFAULT_APP_FEATURES: AppFeatureKeys = {
  cases_base: true,
  isolate_host: true,
  rules_load_prepackaged: true,
  rules_response_actions: true,
};
