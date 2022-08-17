/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RegistryPolicyTemplate,
  RegistryPolicyInputOnlyTemplate,
  RegistryPolicyIntegrationTemplate,
} from '../types';

export function isInputOnlyPolicyTemplate(
  policyTemplate: RegistryPolicyTemplate
): policyTemplate is RegistryPolicyInputOnlyTemplate {
  return 'input' in policyTemplate;
}

export function isIntegrationPolicyTemplate(
  policyTemplate: RegistryPolicyTemplate
): policyTemplate is RegistryPolicyIntegrationTemplate {
  return 'inputs' in policyTemplate;
}
