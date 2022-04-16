/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
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
      it('calls the endpoint on start with the correct parameters', async () => {
        const setup = service.setup();
        setup.register('my-feature', 'platinum');
        setup.register('my-other-feature', 'gold');
        expect(http.post).not.toHaveBeenCalled();

        service.start({ http });
        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith('/internal/licensing/feature_usage/register', {
          body: JSON.stringify([
            { featureName: 'my-feature', licenseType: 'platinum' },
            { featureName: 'my-other-feature', licenseType: 'gold' },
          ]),
        });
      });

      it('does not call endpoint on start if no registrations', async () => {
        service.setup();
        service.start({ http });
        expect(http.post).not.toHaveBeenCalled();
      });

      it('does not call endpoint on start if on anonymous path', async () => {
        http.anonymousPaths.isAnonymous.mockReturnValue(true);
        const setup = service.setup();
        setup.register('my-feature', 'platinum');
        service.start({ http });
        expect(http.post).not.toHaveBeenCalled();
      });
    });
  });

  describe('#start', () => {
    describe('#notifyUsage', () => {
      it('calls the endpoint with the correct parameters', async () => {
        service.setup();
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
        service.setup();
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

      it('does not call endpoint if on anonymous path', async () => {
        http.anonymousPaths.isAnonymous.mockReturnValue(true);
        service.setup();
        const start = service.start({ http });
        await start.notifyUsage('my-feature', 42);
        expect(http.post).not.toHaveBeenCalled();
      });
    });
  });
});
