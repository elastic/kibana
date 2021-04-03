/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientInternal, CasesClientArgs, GetClientsFactories } from './types';
import { createAlertsSubClient } from './alerts/client';
import { createConfigurationSubClient } from './configure/client';

export const createCasesClientInternal = (
  args: CasesClientArgs,
  getCasesClient: GetClientsFactories['getCasesClient']
): CasesClientInternal => {
  const casesClientInternal: CasesClientInternal = {
    alerts: createAlertsSubClient(args, {
      getCasesClient,
      getCasesInternalClient: () => casesClientInternal,
    }),
    configuration: createConfigurationSubClient(args, {
      getCasesClient,
      getCasesInternalClient: () => casesClientInternal,
    }),
  };

  return Object.freeze(casesClientInternal);
};
