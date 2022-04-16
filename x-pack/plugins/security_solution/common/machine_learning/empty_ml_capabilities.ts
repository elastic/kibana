/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlCapabilitiesResponse } from '@kbn/ml-plugin/common/types/capabilities';
import { getDefaultMlCapabilities } from '@kbn/ml-plugin/common';

export const emptyMlCapabilities: MlCapabilitiesResponse = {
  capabilities: getDefaultMlCapabilities(),
  isPlatinumOrTrialLicense: false,
  mlFeatureEnabledInSpace: false,
  upgradeInProgress: false,
};
