/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  DEFAULT_ALERTS_ILM_POLICY,
  DEFAULT_ALERTS_ILM_POLICY_NAME,
} from './default_lifecycle_policy';
export { ECS_COMPONENT_TEMPLATE_NAME, ECS_CONTEXT } from './alerts_service';
export { getComponentTemplate } from './resource_installer_utils';
export {
  type InitializationPromise,
  successResult,
  errorResult,
} from './create_resource_installation_helper';
export { AlertsService, type PublicFrameworkAlertsService } from './alerts_service';
