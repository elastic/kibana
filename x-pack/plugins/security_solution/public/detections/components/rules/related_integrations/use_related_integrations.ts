/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { RelatedIntegrationArray } from '../../../../../common/detection_engine/rule_schema';
import type { IntegrationDetails } from './integration_details';
import { calculateIntegrationDetails } from './integration_details';
import { useInstalledIntegrations } from './use_installed_integrations';

export interface UseRelatedIntegrationsResult {
  integrations: IntegrationDetails[];
  isLoaded: boolean;
}

export const useRelatedIntegrations = (
  relatedIntegrations: RelatedIntegrationArray
): UseRelatedIntegrationsResult => {
  const { data: installedIntegrations } = useInstalledIntegrations({ packages: [] });

  return useMemo(() => {
    const integrationDetails = calculateIntegrationDetails(
      relatedIntegrations,
      installedIntegrations
    );

    return {
      integrations: integrationDetails,
      isLoaded: installedIntegrations != null,
    };
  }, [relatedIntegrations, installedIntegrations]);
};
