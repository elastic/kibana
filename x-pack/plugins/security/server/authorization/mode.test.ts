/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { authorizationModeFactory } from './mode';

import { httpServerMock } from '../../../../../src/core/server/mocks';
import { licenseMock } from '../licensing/index.mock';
import { SecurityLicenseFeatures } from '../licensing/license_features';
import { SecurityLicense } from '../licensing';

describe(`#useRbacForRequest`, () => {
  let mockLicense: jest.Mocked<SecurityLicense>;
  beforeEach(() => {
    mockLicense = licenseMock.create();
    mockLicense.getFeatures.mockReturnValue({ allowRbac: false } as SecurityLicenseFeatures);
  });

  test(`throws an Error if request isn't specified`, async () => {
    const mode = authorizationModeFactory(mockLicense);
    expect(() => mode.useRbacForRequest(undefined as any)).toThrowErrorMatchingInlineSnapshot(
      `"Invalid value used as weak map key"`
    );
  });

  test(`throws an Error if request is "null"`, async () => {
    const mode = authorizationModeFactory(mockLicense);

    expect(() => mode.useRbacForRequest(null as any)).toThrowErrorMatchingInlineSnapshot(
      `"Invalid value used as weak map key"`
    );
  });

  test(`returns false if "allowRbac" is false`, async () => {
    const mode = authorizationModeFactory(mockLicense);

    const result = mode.useRbacForRequest(httpServerMock.createKibanaRequest());
    expect(result).toBe(false);
  });

  test(`returns false if "allowRbac" is initially false, and changes to true`, async () => {
    const mode = authorizationModeFactory(mockLicense);
    const request = httpServerMock.createKibanaRequest();

    expect(mode.useRbacForRequest(request)).toBe(false);

    mockLicense.getFeatures.mockReturnValue({ allowRbac: true } as SecurityLicenseFeatures);
    expect(mode.useRbacForRequest(request)).toBe(false);
  });

  test(`returns true if "allowRbac" is true`, async () => {
    mockLicense.getFeatures.mockReturnValue({ allowRbac: true } as SecurityLicenseFeatures);
    const mode = authorizationModeFactory(mockLicense);

    const result = mode.useRbacForRequest(httpServerMock.createKibanaRequest());
    expect(result).toBe(true);
  });

  test(`returns true if "allowRbac" is initially true, and changes to false`, async () => {
    mockLicense.getFeatures.mockReturnValue({ allowRbac: true } as SecurityLicenseFeatures);
    const mode = authorizationModeFactory(mockLicense);
    const request = httpServerMock.createKibanaRequest();

    expect(mode.useRbacForRequest(request)).toBe(true);

    mockLicense.getFeatures.mockReturnValue({ allowRbac: false } as SecurityLicenseFeatures);
    expect(mode.useRbacForRequest(request)).toBe(true);
  });
});
