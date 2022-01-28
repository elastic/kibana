/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from '../../../endpoint/mocks';
import { BaseValidatorMock, createExceptionItemLikeOptionsMock } from './mocks';
import { EndpointArtifactExceptionValidationError } from './errors';
import { httpServerMock } from '../../../../../../../src/core/server/mocks';
import { createFleetAuthzMock, PackagePolicy } from '../../../../../fleet/common';
import { PackagePolicyServiceInterface } from '../../../../../fleet/server';
import { ExceptionItemLikeOptions } from '../types';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../common/endpoint/service/artifacts';
import { securityMock } from '../../../../../security/server/mocks';

describe('When using Artifacts Exceptions BaseValidator', () => {
  let endpointAppContextServices: EndpointAppContextService;
  let kibanaRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let exceptionLikeItem: ExceptionItemLikeOptions;
  let validator: BaseValidatorMock;
  let packagePolicyService: jest.Mocked<PackagePolicyServiceInterface>;
  let initValidator: (withNoAuth?: boolean, withBasicLicense?: boolean) => BaseValidatorMock;

  beforeEach(() => {
    kibanaRequest = httpServerMock.createKibanaRequest();
    exceptionLikeItem = createExceptionItemLikeOptionsMock();

    const servicesStart = createMockEndpointAppContextServiceStartContract();

    packagePolicyService =
      servicesStart.packagePolicyService as jest.Mocked<PackagePolicyServiceInterface>;

    endpointAppContextServices = new EndpointAppContextService();
    endpointAppContextServices.setup(createMockEndpointAppContextServiceSetupContract());
    endpointAppContextServices.start(servicesStart);

    initValidator = (withNoAuth: boolean = false, withBasicLicense = false) => {
      if (withNoAuth) {
        const fleetAuthz = createFleetAuthzMock();
        fleetAuthz.fleet.all = false;
        (servicesStart.fleetAuthzService?.fromRequest as jest.Mock).mockResolvedValue(fleetAuthz);
        (servicesStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue(
          securityMock.createMockAuthenticatedUser()
        );
      }

      if (withBasicLicense) {
        (servicesStart.licenseService.isPlatinumPlus as jest.Mock).mockResolvedValue(false);
      }

      validator = new BaseValidatorMock(endpointAppContextServices, kibanaRequest);

      return validator;
    };
  });

  it('should use default endpoint authz (no access) when `request` is not provided', async () => {
    const baseValidator = new BaseValidatorMock(endpointAppContextServices);

    await expect(baseValidator._isAllowedToCreateArtifactsByPolicy()).resolves.toBe(false);
    await expect(baseValidator._validateCanManageEndpointArtifacts()).rejects.toBeInstanceOf(
      EndpointArtifactExceptionValidationError
    );
  });

  it('should validate is allowed to manage endpoint artifacts', async () => {
    await expect(initValidator()._validateCanManageEndpointArtifacts()).resolves.toBeUndefined();
  });

  it('should throw if not allowed to manage endpoint artifacts', async () => {
    await expect(initValidator(true)._validateCanManageEndpointArtifacts()).rejects.toBeInstanceOf(
      EndpointArtifactExceptionValidationError
    );
  });

  it('should validate basic artifact data', async () => {
    await expect(initValidator()._validateBasicData(exceptionLikeItem)).resolves.toBeUndefined();
  });

  it.each([
    [
      'name is empty',
      () => {
        exceptionLikeItem.name = '';
      },
    ],
    [
      'namespace is not agnostic',
      () => {
        exceptionLikeItem.namespaceType = 'single';
      },
    ],
    [
      'osTypes has more than 1 value',
      () => {
        exceptionLikeItem.osTypes = ['macos', 'linux'];
      },
    ],
    [
      'osType has invalid value',
      () => {
        exceptionLikeItem.osTypes = ['xunil' as 'linux'];
      },
    ],
  ])('should throw if %s', async (_, setupData) => {
    setupData();

    await expect(initValidator()._validateBasicData(exceptionLikeItem)).rejects.toBeInstanceOf(
      EndpointArtifactExceptionValidationError
    );
  });

  it('should validate is allowed to create artifacts by policy', async () => {
    await expect(
      initValidator()._validateCanCreateByPolicyArtifacts(exceptionLikeItem)
    ).resolves.toBeUndefined();
  });

  it('should throw if not allowed to create artifacts by policy', async () => {
    await expect(
      initValidator(false, true)._validateCanCreateByPolicyArtifacts(exceptionLikeItem)
    ).rejects.toBeInstanceOf(EndpointArtifactExceptionValidationError);
  });

  it('should validate policy ids for by policy artifacts', async () => {
    packagePolicyService.getByIDs.mockResolvedValue([
      {
        id: '123',
        version: '123',
      } as PackagePolicy,
    ]);

    await expect(initValidator()._validateByPolicyItem(exceptionLikeItem)).resolves.toBeUndefined();
  });

  it('should throw if policy ids for by policy artifacts are not valid', async () => {
    packagePolicyService.getByIDs.mockResolvedValue([
      {
        id: '123',
        version: undefined,
      } as PackagePolicy,
    ]);

    await expect(initValidator()._validateByPolicyItem(exceptionLikeItem)).rejects.toBeInstanceOf(
      EndpointArtifactExceptionValidationError
    );
  });

  it.each([
    ['no policies (unassigned)', () => createExceptionItemLikeOptionsMock({ tags: [] })],
    [
      'different policy',
      () => createExceptionItemLikeOptionsMock({ tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}:456`] }),
    ],
    [
      'additional policies',
      () =>
        createExceptionItemLikeOptionsMock({
          tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}:123`, `${BY_POLICY_ARTIFACT_TAG_PREFIX}:456`],
        }),
    ],
  ])(
    'should return `true` when `wasByPolicyEffectScopeChanged()` is called with: %s',
    (_, getUpdated) => {
      expect(initValidator()._wasByPolicyEffectScopeChanged(getUpdated(), exceptionLikeItem)).toBe(
        true
      );
    }
  );

  it.each([
    ['identical data', () => createExceptionItemLikeOptionsMock()],
    [
      'scope changed to all',
      () => createExceptionItemLikeOptionsMock({ tags: [GLOBAL_ARTIFACT_TAG] }),
    ],
  ])('should return `false` when `wasByPolicyEffectScopeChanged()` with: %s', (_, getUpdated) => {
    expect(initValidator()._wasByPolicyEffectScopeChanged(getUpdated(), exceptionLikeItem)).toBe(
      false
    );
  });
});
