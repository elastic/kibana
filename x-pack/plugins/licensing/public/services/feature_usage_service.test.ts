/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock } from '../../../../../src/core/public/mocks';
import { FeatureUsageService } from './feature_usage_service';

describe('FeatureUsageService', () => {
  let http: ReturnType<typeof httpServiceMock.createSetupContract>;
  let service: FeatureUsageService;

  beforeEach(() => {
    http = httpServiceMock.createSetupContract();
    service = new FeatureUsageService();
  });

  describe('#setup', () => {
    describe('#register', () => {
      it('calls the endpoint with the correct parameters', async () => {
        const setup = service.setup({ http });
        await setup.register('my-feature', 'platinum');
        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith('/internal/licensing/feature_usage/register', {
          body: JSON.stringify({
            featureName: 'my-feature',
            licenseType: 'platinum',
          }),
        });
      });
    });
  });

  describe('#start', () => {
    describe('#notifyUsage', () => {
      it('calls the endpoint with the correct parameters', async () => {
        service.setup({ http });
        const start = service.start({ http });
        await start.notifyUsage('my-feature', 42);

        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith('/internal/licensing/feature_usage/notify', {
          body: JSON.stringify({
            featureName: 'my-feature',
            lastUsed: 42,
          }),
        });
      });

      it('correctly convert dates', async () => {
        service.setup({ http });
        const start = service.start({ http });

        const now = new Date();

        await start.notifyUsage('my-feature', now);

        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith('/internal/licensing/feature_usage/notify', {
          body: JSON.stringify({
            featureName: 'my-feature',
            lastUsed: now.getTime(),
          }),
        });
      });
    });
  });
});
