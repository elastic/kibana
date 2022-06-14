/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../common/lib/kibana';
import { IntegrationPrivileges } from './integration_privileges';

export const useIntegrationPrivileges = (): IntegrationPrivileges => {
  const services = useKibana().services;

  const hasReadPrivilegesFor: Record<string, boolean> = {
    savedObjectsManagement: Boolean(services.application.capabilities.savedObjectsManagement.read),
    integrations: Boolean(services.application.capabilities.fleet.read),
    fleet: Boolean(services.application.capabilities.fleetv2.read),
  };

  const canReadInstalledIntegrations =
    hasReadPrivilegesFor.savedObjectsManagement ||
    hasReadPrivilegesFor.integrations ||
    hasReadPrivilegesFor.fleet;

  return {
    canReadInstalledIntegrations,
  };
};
