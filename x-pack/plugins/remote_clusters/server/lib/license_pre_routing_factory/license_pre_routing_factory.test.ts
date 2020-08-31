/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { kibanaResponseFactory } from '../../../../../../src/core/server';
import { licensePreRoutingFactory } from '../license_pre_routing_factory';
import { LicenseStatus } from '../../types';

describe('licensePreRoutingFactory()', () => {
  let mockDeps: any;
  let mockContext: any;
  let licenseStatus: LicenseStatus;

  beforeEach(() => {
    mockDeps = { getLicenseStatus: () => licenseStatus };
    mockContext = {
      core: {},
      actions: {},
      licensing: {},
    };
  });

  describe('status is not valid', () => {
    it('replies with 403', () => {
      licenseStatus = { valid: false };
      const stubRequest: any = {};
      const stubHandler: any = () => {};
      const routeWithLicenseCheck = licensePreRoutingFactory(mockDeps, stubHandler);
      const response: any = routeWithLicenseCheck(mockContext, stubRequest, kibanaResponseFactory);
      expect(response.status).to.be(403);
    });
  });

  describe('status is valid', () => {
    it('replies with nothing', () => {
      licenseStatus = { valid: true };
      const stubRequest: any = {};
      const stubHandler: any = () => null;
      const routeWithLicenseCheck = licensePreRoutingFactory(mockDeps, stubHandler);
      const response = routeWithLicenseCheck(mockContext, stubRequest, kibanaResponseFactory);
      expect(response).to.be(null);
    });
  });
});
