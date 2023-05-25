/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppFeatureKeys } from '@kbn/security-solution-plugin/common';
import { AppFeatureKey } from '@kbn/security-solution-plugin/common/types/app_features';

export const DEFAULT_APP_FEATURES: AppFeatureKeys = {
  [AppFeatureKey.casesBase]: true,
  [AppFeatureKey.rulesLoadPrepackaged]: true,
  [AppFeatureKey.rulesResponseActions]: true,
};
