/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../common/lib/kibana';
import type { IntegrationPrivileges } from './integration_privileges';

/**
 * Hook for determining if user has fleet/integrations/SOM privileges for fetching
 * installed integrations. Initially used as we weren't using the fleet.internalReadonlySoClient
 * for fetching integrations, but keeping this around for a release or two as we add more
 * fleet/integration features within Security Solution in case it needs to be leveraged for those.
 */
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
