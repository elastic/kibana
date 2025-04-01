/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useActor } from '@xstate/react';
import { useCustomIntegrationsContext } from '../state_machines/custom_integrations/provider';

export const useCustomIntegrations = () => {
  const customIntegrationsStateService = useCustomIntegrationsContext();
  const [customIntegrationsState, customIntegrationsPageSend] = useActor(
    customIntegrationsStateService
  );

  return {
    customIntegrationsState,
    customIntegrationsPageSend,
    customIntegrationsStateService,
  };
};
