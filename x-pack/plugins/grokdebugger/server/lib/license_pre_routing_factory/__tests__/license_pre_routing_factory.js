/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import Boom from 'boom';
import { licensePreRoutingFactory } from '../license_pre_routing_factory';

describe('license_pre_routing_factory', () => {
  describe('#grokDebuggerFeaturePreRoutingFactory', () => {
    let mockServer;
    let mockLicenseCheckResults;

    beforeEach(() => {
      mockServer = {
        plugins: {
          xpack_main: {
            info: {
              feature: () => ({
                getLicenseCheckResults: () => mockLicenseCheckResults
              })
            }
          }
        }
      };
    });

    describe('isAvailable is false', () => {
      beforeEach(() => {
        mockLicenseCheckResults = {
          isAvailable: false
        };
      });

      it ('replies with 403', async () => {
        const licensePreRouting = licensePreRoutingFactory(mockServer);
        const stubRequest = {};
        const response = await licensePreRouting(stubRequest);
        expect(response).to.be.an(Error);
        expect(response.isBoom).to.be(true);
        expect(response.output.statusCode).to.be(403);
      });
    });

    describe('isAvailable is true', async () => {
      beforeEach(() => {
        mockLicenseCheckResults = {
          isAvailable: true
        };
      });

      it ('replies with nothing', async () => {
        const licensePreRouting = licensePreRoutingFactory(mockServer);
        const stubRequest = {};
        const response = licensePreRouting(stubRequest);
        expect(response).to.eql(Boom.forbidden());
      });
    });
  });
});
