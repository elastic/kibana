/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APMLocatorDefinition, APM_APP_LOCATOR } from './locator';

describe('APMLocatorDefinition', () => {
  test('locator has the right ID and app', async () => {
    const locator = new APMLocatorDefinition();
    const location = await locator.getLocation({});

    expect(locator.id).toBe(APM_APP_LOCATOR);
    expect(location).toMatchObject({
      app: 'apm',
    });
  });

  test('when serviceName is provided, returns path to the given service overiew page', async () => {
    const locator = new APMLocatorDefinition();
    const location = await locator.getLocation({
      serviceName: 'example-app',
    });

    expect(location).toMatchObject({
      path: '/services/example-app/overview',
      state: {},
    });
  });

  test('when both serviceName and serviceOverViewActiveTab are provided, returns path to the given service overiew page with the right tab selected', async () => {
    const locator = new APMLocatorDefinition();
    const location = await locator.getLocation({
      serviceName: 'example-app',
      serviceOverViewActiveTab: 'logs',
    });

    expect(location).toMatchObject({
      path: '/services/example-app/logs',
      state: {},
    });
  });

  test('when serviceOverViewActiveTab is invalid, returns path to the given service overiew page', async () => {
    const locator = new APMLocatorDefinition();
    const location = await locator.getLocation({
      serviceName: 'example-app',
      // @ts-ignore
      serviceOverViewActiveTab: 'invalidTab',
    });

    expect(location).toMatchObject({
      path: '/services/example-app/overview',
      state: {},
    });
  });
});
