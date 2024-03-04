/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useObservabilityAIAssistant } from './use_observability_ai_assistant';

const LICENSE_MANAGEMENT_LOCATOR = 'LICENSE_MANAGEMENT_LOCATOR';

export const useLicenseManagementLocator = () => {
  const service = useObservabilityAIAssistant();

  const locators = service.getLicenseManagementLocator();

  const locator = locators.url.locators.get(LICENSE_MANAGEMENT_LOCATOR);

  // license management does not exist on serverless
  if (!locator) return;

  return () =>
    locator.navigate({
      page: 'dashboard',
    });
};
