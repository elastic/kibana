/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';

export const isAuthorizedAssistant = (capabilities: ApplicationStart['capabilities']): boolean => {
  const { fleet: integrations, fleetv2: fleet, actions } = capabilities;
  if (!fleet?.all || !integrations?.all || !actions?.show || !actions?.execute) {
    return false;
  }
  return true;
};

export const isAuthorizedUpload = (capabilities: ApplicationStart['capabilities']): boolean => {
  const { fleet: integrations, fleetv2: fleet } = capabilities;
  if (!fleet?.all || !integrations?.all) {
    return false;
  }
  return true;
};
