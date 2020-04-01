/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { kibanaResponseFactory } from '../../../../../../../src/core/server';
import { licensePreRoutingFactory } from '../license_pre_routing_factory';

describe('license_pre_routing_factory', () => {
  describe('#reportingFeaturePreRoutingFactory', () => {
    let mockDeps;
    let licenseStatus;

    beforeEach(() => {
      mockDeps = { getLicenseStatus: () => licenseStatus };
    });

    describe('status is not valid', () => {
      it('replies with 403', () => {
        licenseStatus = { hasRequired: false };
        const routeWithLicenseCheck = licensePreRoutingFactory(mockDeps, () => {});
        const stubRequest = {};
        const response = routeWithLicenseCheck({}, stubRequest, kibanaResponseFactory);
        expect(response.status).to.be(403);
      });
    });

    describe('status is valid', () => {
      it('replies with nothing', () => {
        licenseStatus = { hasRequired: true };
        const routeWithLicenseCheck = licensePreRoutingFactory(mockDeps, () => null);
        const stubRequest = {};
        const response = routeWithLicenseCheck({}, stubRequest, kibanaResponseFactory);
        expect(response).to.be(null);
      });
    });
  });
});
