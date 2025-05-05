/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { IntegrationType } from '@kbn/wci-common';
import { useWorkChatServices } from './use_workchat_service';

/**
 * Hook to get the configuration form component for a specific integration type
 * @param type - The integration type
 * @returns The configuration form component or undefined if not available
 */
export const useIntegrationConfigurationForm = (type: string | undefined) => {
  const { integrationRegistry } = useWorkChatServices();

  const configurationForm = useMemo(() => {
    if (!type) return undefined;

    const integrationDefinition = integrationRegistry.get(type as IntegrationType);
    return integrationDefinition?.getConfigurationForm?.();
  }, [type, integrationRegistry]);

  return configurationForm;
};
