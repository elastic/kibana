/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { hasMlAdminPermissions } from '../../../common/machine_learning/has_ml_admin_permissions';
import { mlServicesMock } from './mocks';
import { hasMlLicense, isMlAdmin, buildMlAuthz } from './authz';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

jest.mock('../../../common/machine_learning/has_ml_admin_permissions');

describe('isMlAdmin', () => {
  it('returns true if hasMlAdminPermissions is true', async () => {
    const mockMl = mlServicesMock.createSetupContract();
    const request = httpServerMock.createKibanaRequest();
    const savedObjectsClient = savedObjectsClientMock.create();
    (hasMlAdminPermissions as jest.Mock).mockReturnValue(true);

    expect(await isMlAdmin({ ml: mockMl, request, savedObjectsClient })).toEqual(true);
  });

  it('returns false if hasMlAdminPermissions is false', async () => {
    const mockMl = mlServicesMock.createSetupContract();
    const request = httpServerMock.createKibanaRequest();
    const savedObjectsClient = savedObjectsClientMock.create();
    (hasMlAdminPermissions as jest.Mock).mockReturnValue(false);

    expect(await isMlAdmin({ ml: mockMl, request, savedObjectsClient })).toEqual(false);
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
  let mlMock: ReturnType<typeof mlServicesMock.createSetupContract>;
  let request: KibanaRequest;
  let savedObjectsClient: SavedObjectsClientContract;

  beforeEach(() => {
    licenseMock = licensingMock.createLicenseMock();
    mlMock = mlServicesMock.createSetupContract();
    request = httpServerMock.createKibanaRequest();
    savedObjectsClient = savedObjectsClientMock.create();
  });

  describe('#validateRuleType', () => {
    it('is valid for a non-ML rule when ML plugin is unavailable', async () => {
      const mlAuthz = buildMlAuthz({
        license: licenseMock,
        ml: undefined,
        request,
        savedObjectsClient,
      });

      const validation = await mlAuthz.validateRuleType('query');

      expect(validation.valid).toEqual(true);
    });

    it('is invalid for an ML rule when ML plugin is unavailable', async () => {
      const mlAuthz = buildMlAuthz({
        license: licenseMock,
        ml: undefined,
        request,
        savedObjectsClient,
      });

      const validation = await mlAuthz.validateRuleType('machine_learning');

      expect(validation.valid).toEqual(false);
      expect(validation.message).toEqual(
        'The machine learning plugin is not available. Try enabling the plugin.'
      );
    });

    it('is valid for a non-ML rule when license is insufficient', async () => {
      licenseMock.hasAtLeast.mockReturnValue(false);

      const mlAuthz = buildMlAuthz({
        license: licenseMock,
        ml: mlMock,
        request,
        savedObjectsClient,
      });

      const validation = await mlAuthz.validateRuleType('query');

      expect(validation.valid).toEqual(true);
    });

    it('is invalid for an ML rule when license is insufficient', async () => {
      licenseMock.hasAtLeast.mockReturnValue(false);

      const mlAuthz = buildMlAuthz({
        license: licenseMock,
        ml: mlMock,
        request,
        savedObjectsClient,
      });

      const validation = await mlAuthz.validateRuleType('machine_learning');

      expect(validation.valid).toEqual(false);
      expect(validation.message).toEqual(
        'Your license does not support machine learning. Please upgrade your license.'
      );
    });

    it('is valid for a non-ML rule when not an ML Admin', async () => {
      (hasMlAdminPermissions as jest.Mock).mockReturnValue(false);

      const mlAuthz = buildMlAuthz({
        license: licenseMock,
        ml: mlMock,
        request,
        savedObjectsClient,
      });

      const validation = await mlAuthz.validateRuleType('query');

      expect(validation.valid).toEqual(true);
    });

    it('is invalid for an ML rule when not an ML Admin', async () => {
      licenseMock.hasAtLeast.mockReturnValue(true); // prevents short-circuit on license check
      (hasMlAdminPermissions as jest.Mock).mockReturnValue(false);

      const mlAuthz = buildMlAuthz({
        license: licenseMock,
        ml: mlMock,
        request,
        savedObjectsClient,
      });

      const validation = await mlAuthz.validateRuleType('machine_learning');

      expect(validation.valid).toEqual(false);
      expect(validation.message).toEqual(
        'The current user is not a machine learning administrator.'
      );
    });

    it('is valid for an ML rule if ML available, license is sufficient, and an ML Admin', async () => {
      licenseMock.hasAtLeast.mockReturnValue(true);
      (hasMlAdminPermissions as jest.Mock).mockReturnValue(true);

      const mlAuthz = buildMlAuthz({
        license: licenseMock,
        ml: mlMock,
        request,
        savedObjectsClient,
      });

      const validation = await mlAuthz.validateRuleType('machine_learning');

      expect(validation.valid).toEqual(true);
      expect(validation.message).toBeUndefined();
    });

    it('only calls ml services once for multiple invocations', async () => {
      const mockMlCapabilities = jest.fn();
      mlMock.mlSystemProvider.mockImplementation(() => ({
        mlInfo: jest.fn(),
        mlAnomalySearch: jest.fn(),
        mlCapabilities: mockMlCapabilities,
      }));

      const mlAuthz = buildMlAuthz({
        license: licenseMock,
        ml: mlMock,
        request,
        savedObjectsClient,
      });

      await mlAuthz.validateRuleType('machine_learning');
      await mlAuthz.validateRuleType('machine_learning');
      await mlAuthz.validateRuleType('machine_learning');

      expect(mockMlCapabilities).toHaveBeenCalledTimes(1);
    });

    it('does not call ml services for non-ML rules', async () => {
      const mockMlCapabilities = jest.fn();
      mlMock.mlSystemProvider.mockImplementation(() => ({
        mlInfo: jest.fn(),
        mlAnomalySearch: jest.fn(),
        mlCapabilities: mockMlCapabilities,
      }));

      const mlAuthz = buildMlAuthz({
        license: licenseMock,
        ml: mlMock,
        request,
        savedObjectsClient,
      });

      await mlAuthz.validateRuleType('query');
      await mlAuthz.validateRuleType('query');
      await mlAuthz.validateRuleType('query');

      expect(mockMlCapabilities).not.toHaveBeenCalled();
    });

    it('validates the same cache result per request if permissions change mid-stream', async () => {
      licenseMock.hasAtLeast.mockReturnValueOnce(false);
      licenseMock.hasAtLeast.mockReturnValueOnce(true);

      const mlAuthz = buildMlAuthz({
        license: licenseMock,
        ml: mlMock,
        request,
        savedObjectsClient,
      });

      const validationFirst = await mlAuthz.validateRuleType('machine_learning');
      const validationSecond = await mlAuthz.validateRuleType('machine_learning');

      expect(validationFirst.valid).toEqual(false);
      expect(validationFirst.message).toEqual(
        'Your license does not support machine learning. Please upgrade your license.'
      );
      expect(validationSecond.valid).toEqual(false);
      expect(validationSecond.message).toEqual(
        'Your license does not support machine learning. Please upgrade your license.'
      );
    });

    it('will invalidate the cache result if the builder is called a second time after a license change', async () => {
      licenseMock.hasAtLeast.mockReturnValueOnce(false);
      licenseMock.hasAtLeast.mockReturnValueOnce(true);
      (hasMlAdminPermissions as jest.Mock).mockReturnValueOnce(true);

      const mlAuthzFirst = buildMlAuthz({
        license: licenseMock,
        ml: mlMock,
        request,
        savedObjectsClient,
      });

      const mlAuthzSecond = buildMlAuthz({
        license: licenseMock,
        ml: mlMock,
        request,
        savedObjectsClient,
      });

      const validationFirst = await mlAuthzFirst.validateRuleType('machine_learning');
      const validationSecond = await mlAuthzSecond.validateRuleType('machine_learning');

      expect(validationFirst.valid).toEqual(false);
      expect(validationFirst.message).toEqual(
        'Your license does not support machine learning. Please upgrade your license.'
      );
      expect(validationSecond.valid).toEqual(true);
      expect(validationSecond.message).toBeUndefined();
    });
  });
});
