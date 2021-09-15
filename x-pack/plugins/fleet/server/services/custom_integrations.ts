/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomIntegrationsPluginSetup } from '../../../../../src/plugins/custom_integrations/server';

let customIntegrations: CustomIntegrationsPluginSetup;

export function setCustomIntegrations(value: CustomIntegrationsPluginSetup): void {
  customIntegrations = value;
}

export function getCustomIntegrations(): CustomIntegrationsPluginSetup {
  return customIntegrations;
}
