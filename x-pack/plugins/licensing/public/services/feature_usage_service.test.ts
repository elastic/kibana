/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock } from '../../../../../src/core/public/mocks';
import { FeatureUsageService } from './feature_usage_service';

describe('FeatureUsageService', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let service: FeatureUsageService;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    service = new FeatureUsageService();
  });

  describe('#setup', () => {
    describe('#register', () => {
      it('des not call the endpoint during setup', () => {
        const setup = service.setup();
        setup.register('my-feature', 'platinum');
        expect(http.post).not.toHaveBeenCalled();
      });

      it('calls the endpoint with the correct parameters on start', () => {
        const setup = service.setup();
        setup.register('my-feature', 'platinum');
        service.start({ http });
        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith('/internal/licensing/feature_usage/register', {
          body: JSON.stringify({
            featureName: 'my-feature',
            licenseType: 'platinum',
          }),
        });
      });

      it('does not call endpoint if on anonymous path', () => {
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
