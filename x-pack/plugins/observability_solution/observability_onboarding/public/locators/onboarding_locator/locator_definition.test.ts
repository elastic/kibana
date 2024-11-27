/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityOnboardingLocatorDefinition } from './locator_definition';

describe('Observability onboarding locator', () => {
  test('should create a link to the overview page', async () => {
    const locator = new ObservabilityOnboardingLocatorDefinition();
    const location = await locator.getLocation();

    expect(location).toMatchObject({
      app: 'observabilityOnboarding',
      path: '/',
      state: {},
    });
  });

  test('should create a link to specified log source onboarding', async () => {
    const locator = new ObservabilityOnboardingLocatorDefinition();
    const systemLocation = await locator.getLocation({ source: 'customLogs' });

    expect(systemLocation).toMatchObject({
      app: 'observabilityOnboarding',
      path: '/customLogs',
      state: {},
    });
  });
});
