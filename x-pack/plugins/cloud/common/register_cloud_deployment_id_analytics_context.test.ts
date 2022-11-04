/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of } from 'rxjs';
import { registerCloudDeploymentMetadataAnalyticsContext } from './register_cloud_deployment_id_analytics_context';

describe('registerCloudDeploymentIdAnalyticsContext', () => {
  let analytics: { registerContextProvider: jest.Mock };
  beforeEach(() => {
    analytics = {
      registerContextProvider: jest.fn(),
    };
  });

  test('it does not register the context provider if cloudId not provided', () => {
    registerCloudDeploymentMetadataAnalyticsContext(analytics, {});
    expect(analytics.registerContextProvider).not.toHaveBeenCalled();
  });

  test('it registers the static metadata context provider and emits the cloudId', async () => {
    registerCloudDeploymentMetadataAnalyticsContext(analytics, { cloudId: 'cloud_id' });
    expect(analytics.registerContextProvider).toHaveBeenCalledTimes(1);
    const [{ context$ }] = analytics.registerContextProvider.mock.calls[0];
    await expect(firstValueFrom(context$)).resolves.toEqual({ cloudId: 'cloud_id' });
  });

  test('it registers the inTrial context provider', async () => {
    registerCloudDeploymentMetadataAnalyticsContext(analytics, {
      cloudId: 'cloud_id',
      inTrial$: of(true),
    });
    expect(analytics.registerContextProvider).toHaveBeenCalledTimes(2);
    const [{ context$ }] = analytics.registerContextProvider.mock.calls[1];
    await expect(firstValueFrom(context$)).resolves.toEqual({ cloudInTrial: true });
  });

  test('it registers the isPaying context provider', async () => {
    registerCloudDeploymentMetadataAnalyticsContext(analytics, {
      cloudId: 'cloud_id',
      isPaying$: of(true),
    });
    expect(analytics.registerContextProvider).toHaveBeenCalledTimes(2);
    const [{ context$ }] = analytics.registerContextProvider.mock.calls[1];
    await expect(firstValueFrom(context$)).resolves.toEqual({ cloudIsPaying: true });
  });
});
