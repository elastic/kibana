/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { RelatedIntegrationArray } from '../../../../../common/detection_engine/schemas/common';
import { calculateIntegrationDetails, IntegrationDetails } from './integration_details';
import { IntegrationPrivileges } from './integration_privileges';
import { useIntegrationPrivileges } from './use_integration_privileges';
import { useInstalledIntegrations } from './use_installed_integrations';

export interface UseRelatedIntegrationsResult {
  integrations: IntegrationDetails[];
  privileges: IntegrationPrivileges;
  isLoaded: boolean;
}

export const useRelatedIntegrations = (
  relatedIntegrations: RelatedIntegrationArray
): UseRelatedIntegrationsResult => {
  const privileges = useIntegrationPrivileges();
  const { data: installedIntegrations } = useInstalledIntegrations({ packages: [] });

  return useMemo(() => {
    const integrationDetails = calculateIntegrationDetails(
      privileges,
      relatedIntegrations,
      installedIntegrations
    );

    return {
      integrations: integrationDetails,
      privileges,
      isLoaded: installedIntegrations != null,
    };
  }, [privileges, relatedIntegrations, installedIntegrations]);
};
