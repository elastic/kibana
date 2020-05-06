/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../../src/core/server';
import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { hasMlAdminPermissions } from '../../../common/machine_learning/has_ml_admin_permissions';
import { mlServicesMock } from './mocks';
import { hasMlLicense, isMlAdmin, buildMlAuthz } from './authz';
import { licensingMock } from '../../../../licensing/server/mocks';

jest.mock('../../../common/machine_learning/has_ml_admin_permissions');

describe('isMlAdmin', () => {
  it('returns true if hasMlAdminPermissions is true', async () => {
    const mockMl = mlServicesMock.create();
    const request = httpServerMock.createKibanaRequest();
    (hasMlAdminPermissions as jest.Mock).mockReturnValue(true);

    expect(await isMlAdmin({ ml: mockMl, request })).toEqual(true);
  });

  it('returns false if hasMlAdminPermissions is false', async () => {
    const mockMl = mlServicesMock.create();
    const request = httpServerMock.createKibanaRequest();
    (hasMlAdminPermissions as jest.Mock).mockReturnValue(false);

    expect(await isMlAdmin({ ml: mockMl, request })).toEqual(false);
  });
});

describe('hasMlLicense', () => {
  let licenseMock: ReturnType<typeof licensingMock.createLicenseMock>;

  beforeEach(() => {
    licenseMock = licensingMock.createLicenseMock();
  });

  it('returns false for an insufficient license', () => {
    licenseMock.hasAtLeast.mockReturnValue(false);

    expect(hasMlLicense(licenseMock)).toEqual(false);
  });

  it('returns true for a sufficient license', () => {
    licenseMock.hasAtLeast.mockReturnValue(true);

    expect(hasMlLicense(licenseMock)).toEqual(true);
  });
});

describe('mlAuthz', () => {
  let licenseMock: ReturnType<typeof licensingMock.createLicenseMock>;
  let mlMock: ReturnType<typeof mlServicesMock.create>;
  let request: KibanaRequest;

  beforeEach(() => {
    licenseMock = licensingMock.createLicenseMock();
    mlMock = mlServicesMock.create();
    request = httpServerMock.createKibanaRequest();
  });

  it('is valid for a non-ML rule when ML plugin is unavailable', async () => {
    const mlAuthz = await buildMlAuthz({
      license: licenseMock,
      ml: undefined,
      request,
    });

    const validation = mlAuthz.validateRuleType('query');

    expect(validation.valid).toEqual(true);
  });

  it('is invalid for an ML rule when ML plugin is unavailable', async () => {
    const mlAuthz = await buildMlAuthz({
      license: licenseMock,
      ml: undefined,
      request,
    });

    const validation = mlAuthz.validateRuleType('machine_learning');

    expect(validation.valid).toEqual(false);
    expect(validation.message).toEqual(
      'The machine learning plugin is not available. Try enabling the plugin.'
    );
  });

  it('is valid for a non-ML rule when license is insufficient', async () => {
    licenseMock.hasAtLeast.mockReturnValue(false);

    const mlAuthz = await buildMlAuthz({
      license: licenseMock,
      ml: mlMock,
      request,
    });

    const validation = mlAuthz.validateRuleType('query');

    expect(validation.valid).toEqual(true);
  });

  it('is invalid for an ML rule when license is insufficient', async () => {
    licenseMock.hasAtLeast.mockReturnValue(false);

    const mlAuthz = await buildMlAuthz({
      license: licenseMock,
      ml: mlMock,
      request,
    });

    const validation = mlAuthz.validateRuleType('machine_learning');

    expect(validation.valid).toEqual(false);
    expect(validation.message).toEqual(
      'Your license does not support machine learning. Please upgrade your license.'
    );
  });

  it('is valid for a non-ML rule when not an ML Admin', async () => {
    (hasMlAdminPermissions as jest.Mock).mockReturnValue(false);

    const mlAuthz = await buildMlAuthz({
      license: licenseMock,
      ml: mlMock,
      request,
    });

    const validation = mlAuthz.validateRuleType('query');

    expect(validation.valid).toEqual(true);
  });

  it('is invalid for an ML rule when not an ML Admin', async () => {
    licenseMock.hasAtLeast.mockReturnValue(true); // prevents short-circuit on license check
    (hasMlAdminPermissions as jest.Mock).mockReturnValue(false);

    const mlAuthz = await buildMlAuthz({
      license: licenseMock,
      ml: mlMock,
      request,
    });

    const validation = mlAuthz.validateRuleType('machine_learning');

    expect(validation.valid).toEqual(false);
    expect(validation.message).toEqual('The current user is not a machine learning administrator.');
  });

  it('is valid for an ML rule if ML available, license is sufficient, and an ML Admin', async () => {
    licenseMock.hasAtLeast.mockReturnValue(true);
    (hasMlAdminPermissions as jest.Mock).mockReturnValue(true);
    licenseMock.hasAtLeast.mockReturnValue(true);

    const mlAuthz = await buildMlAuthz({
      license: licenseMock,
      ml: mlMock,
      request,
    });

    const validation = mlAuthz.validateRuleType('machine_learning');

    expect(validation.valid).toEqual(true);
    expect(validation.message).toBeUndefined();
  });
});
