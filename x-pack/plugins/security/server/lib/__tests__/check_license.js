/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';
import { checkLicense } from '../check_license';

describe('check_license', function () {

  let mockXPackInfo;

  beforeEach(function () {
    mockXPackInfo = {
      isAvailable: sinon.stub(),
      feature: sinon.stub(),
      license: sinon.stub({
        isOneOf() {},
        isActive() {}
      })
    };

    mockXPackInfo.isAvailable.returns(true);
  });

  it('should show login page but not allow login if license information is not available.', () => {
    mockXPackInfo.isAvailable.returns(false);

    const licenseCheckResults = checkLicense(mockXPackInfo);
    expect(licenseCheckResults).to.be.eql({
      showLogin: true,
      allowLogin: false,
      showLinks: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      loginMessage: 'Login is currently disabled. Administrators should consult the Kibana logs for more details.'
    });
  });

  it('should not show login page or other security elements if license is basic.', () => {
    mockXPackInfo.license.isOneOf.withArgs(['basic']).returns(true);
    mockXPackInfo.license.isActive.returns(true);
    mockXPackInfo.feature.withArgs('security').returns({
      isEnabled: () => { return true; }
    });

    const licenseCheckResults = checkLicense(mockXPackInfo);
    expect(licenseCheckResults).to.be.eql({
      showLogin: false,
      allowLogin: false,
      showLinks: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      linksMessage: 'Your Basic license does not support Security. Please upgrade your license.'
    });
  });

  it('should not show login page or other security elements if security is disabled in Elasticsearch.', () => {
    mockXPackInfo.license.isOneOf.withArgs(['basic']).returns(false);
    mockXPackInfo.license.isActive.returns(true);
    mockXPackInfo.feature.withArgs('security').returns({
      isEnabled: () => { return false; }
    });

    const licenseCheckResults = checkLicense(mockXPackInfo);
    expect(licenseCheckResults).to.be.eql({
      showLogin: false,
      allowLogin: false,
      showLinks: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      linksMessage: 'Access is denied because Security is disabled in Elasticsearch.'
    });
  });

  it('should allow to login but forbid document level security if license is not platinum, trial or basic.', () => {
    const isBasicOrTrialOrPlatinumMatcher = sinon.match(
      (licenses) => licenses.includes('basic')
        || licenses.includes('trial')
        || licenses.includes('platinum')
    );
    mockXPackInfo.license.isOneOf
      .returns(true)
      .withArgs(isBasicOrTrialOrPlatinumMatcher).returns(false);
    mockXPackInfo.feature.withArgs('security').returns({
      isEnabled: () => { return true; }
    });

    mockXPackInfo.license.isActive.returns(true);
    expect(checkLicense(mockXPackInfo)).to.be.eql({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false
    });

    mockXPackInfo.license.isActive.returns(false);
    expect(checkLicense(mockXPackInfo)).to.be.eql({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false
    });
  });

  it('should allow to login and document level security if license is platinum.', () => {
    mockXPackInfo.license.isOneOf
      .returns(false)
      .withArgs(sinon.match((licenses) => licenses.includes('platinum'))).returns(true);
    mockXPackInfo.feature.withArgs('security').returns({
      isEnabled: () => { return true; }
    });

    mockXPackInfo.license.isActive.returns(true);
    expect(checkLicense(mockXPackInfo)).to.be.eql({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      allowRoleDocumentLevelSecurity: true,
      allowRoleFieldLevelSecurity: true
    });

    mockXPackInfo.license.isActive.returns(false);
    expect(checkLicense(mockXPackInfo)).to.be.eql({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      allowRoleDocumentLevelSecurity: true,
      allowRoleFieldLevelSecurity: true
    });
  });

  it('should allow to login and document level security if license is trial.', () => {
    mockXPackInfo.license.isOneOf
      .returns(false)
      .withArgs(sinon.match((licenses) => licenses.includes('trial'))).returns(true);
    mockXPackInfo.feature.withArgs('security').returns({
      isEnabled: () => { return true; }
    });

    mockXPackInfo.license.isActive.returns(true);
    expect(checkLicense(mockXPackInfo)).to.be.eql({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      allowRoleDocumentLevelSecurity: true,
      allowRoleFieldLevelSecurity: true
    });

    mockXPackInfo.license.isActive.returns(false);
    expect(checkLicense(mockXPackInfo)).to.be.eql({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      allowRoleDocumentLevelSecurity: true,
      allowRoleFieldLevelSecurity: true
    });
  });
});
