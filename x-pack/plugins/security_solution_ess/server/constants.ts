/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_APP_FEATURE_KEYS } from '@kbn/security-solution-features/keys';

// Just copying all feature keys for now.
// We may need a different set of keys in the future if we create serverless-specific appFeatures
export const DEFAULT_APP_FEATURES = [...ALL_APP_FEATURE_KEYS];
