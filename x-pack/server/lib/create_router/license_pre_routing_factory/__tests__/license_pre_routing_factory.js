/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { licensePreRoutingFactory } from '../license_pre_routing_factory';
import { INVALID, VALID } from '../../../../../common/license_status';

describe('license_pre_routing_factory', () => {
  describe('#reportingFeaturePreRoutingFactory', () => {
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

    it('instantiates a new instance per plugin', () => {
      const firstInstance = licensePreRoutingFactory(mockServer, 'foo');
      const secondInstance = licensePreRoutingFactory(mockServer, 'bar');

      expect(firstInstance).to.not.be(secondInstance);
    });

    describe('status is invalid', () => {
      beforeEach(() => {
        mockLicenseCheckResults = {
          status: INVALID
        };
      });

      it ('replies with 403', () => {
        const licensePreRouting = licensePreRoutingFactory(mockServer);
        const stubRequest = {};
        expect(() => licensePreRouting(stubRequest)).to.throwException((response) => {
          expect(response).to.be.an(Error);
          expect(response.isBoom).to.be(true);
          expect(response.output.statusCode).to.be(403);
        });
      });
    });

    describe('status is valid', () => {
      beforeEach(() => {
        mockLicenseCheckResults = {
          status: VALID
        };
      });

      it ('replies with nothing', () => {
        const licensePreRouting = licensePreRoutingFactory(mockServer);
        const stubRequest = {};
        const response = licensePreRouting(stubRequest);
        expect(response).to.be(null);
      });
    });
  });
});
