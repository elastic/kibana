/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationType } from '@kbn/wci-common';
import type { IntegrationComponentDescriptor } from '@kbn/wci-browser';
import { ExternalServerTool } from './tool';
import { ExternalServerConfigurationForm } from './configuration';

export function getExternalServerIntegrationComponents(): IntegrationComponentDescriptor {
  return {
    getType: () => IntegrationType.external_server,
    getToolCallComponent: (toolName) => ExternalServerTool,
    getConfigurationForm: () => ExternalServerConfigurationForm,
  };
}
