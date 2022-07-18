/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomIntegrationsSetup } from '@kbn/custom-integrations-plugin/public';

let customIntegrations: CustomIntegrationsSetup;

export function setCustomIntegrations(value: CustomIntegrationsSetup): void {
  customIntegrations = value;
}

export function getCustomIntegrations(): CustomIntegrationsSetup {
  return customIntegrations;
}
