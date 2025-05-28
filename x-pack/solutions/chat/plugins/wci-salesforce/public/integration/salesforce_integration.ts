/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationType } from '@kbn/wci-common';
import type { IntegrationComponentDescriptor } from '@kbn/wci-browser';
import { SalesforceTool } from './tool';
import { SalesforceConfigurationForm } from './configuration';

export function getSalesforceIntegrationComponents(): IntegrationComponentDescriptor {
  return {
    getType: () => IntegrationType.salesforce,
    getToolCallComponent: (name) => SalesforceTool,
    getConfigurationForm: () => SalesforceConfigurationForm,
  };
}
