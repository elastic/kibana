/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCloudUrl } from '../navigation/util';
import type { Services } from '../common/services';

export const setOnboardingSettings = (services: Services) => {
  const { securitySolution, cloud } = services;

  securitySolution.setOnboardingSettings({
    userUrl: getCloudUrl('usersAndRoles', cloud),
    isAgentlessAvailable: true,
  });
};
