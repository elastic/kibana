/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { authorizationModeFactory } from './mode';
import { requestFixture } from '../__tests__/__fixtures__/request';

class MockXPackInfoFeature {
  constructor(allowRbac) {
    this.getLicenseCheckResults.mockReturnValue({ allowRbac });
  }

  getLicenseCheckResults = jest.fn();
}

describe(`#useRbacForRequest`, () => {
  test(`throws an Error if request isn't specified`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(false);
    const mode = authorizationModeFactory(mockXpackInfoFeature);

    expect(() => mode.useRbacForRequest()).toThrowErrorMatchingInlineSnapshot(
      `"Invalid value used as weak map key"`
    );
  });

  test(`throws an Error if request is "null"`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(false);
    const mode = authorizationModeFactory(mockXpackInfoFeature);

    expect(() => mode.useRbacForRequest(null)).toThrowErrorMatchingInlineSnapshot(
      `"Invalid value used as weak map key"`
    );
  });

  test(`returns false if xpackInfoFeature.getLicenseCheckResults().allowRbac is false`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(false);
    const mode = authorizationModeFactory(mockXpackInfoFeature);
    const request = requestFixture();

    const result = mode.useRbacForRequest(request);
    expect(result).toBe(false);
  });

  test(`returns false if xpackInfoFeature.getLicenseCheckResults().allowRbac is initially false, and changes to true`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(false);
    const mode = authorizationModeFactory(mockXpackInfoFeature);
    const request = requestFixture();

    expect(mode.useRbacForRequest(request)).toBe(false);
    mockXpackInfoFeature.getLicenseCheckResults.mockReturnValue({ allowRbac: true });
    expect(mode.useRbacForRequest(request)).toBe(false);
  });

  test(`returns true if xpackInfoFeature.getLicenseCheckResults().allowRbac is true`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(true);
    const mode = authorizationModeFactory(mockXpackInfoFeature);
    const request = requestFixture();

    const result = mode.useRbacForRequest(request);
    expect(result).toBe(true);
  });

  test(`returns true if xpackInfoFeature.getLicenseCheckResults().allowRbac is initially true, and changes to false`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(true);
    const mode = authorizationModeFactory(mockXpackInfoFeature);
    const request = requestFixture();

    expect(mode.useRbacForRequest(request)).toBe(true);
    mockXpackInfoFeature.getLicenseCheckResults.mockReturnValue({ allowRbac: false });
    expect(mode.useRbacForRequest(request)).toBe(true);
  });
});
