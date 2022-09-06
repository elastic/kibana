/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import {
  createRulesConfig,
  defineUpdateRulesConfigRoute,
  getUpdatedPackagePolicy,
  updatePackagePolicyRuntimeCfgVar,
  updatePackagePolicyCspRules,
  updateRulesConfigurationHandler,
  type UpdateRulesConfigBodySchema,
  type PackagePolicyRuleUpdatePayload,
  SavedObjectRuleUpdatePayload,
} from './update_rules_configuration';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import type { KibanaRequest, SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import { Chance } from 'chance';
import { createCspRequestHandlerContextMock } from '../../mocks';
import type { CspRequestHandlerContext } from '../../types';
import type { CspRule } from '../../../common/schemas';

const chance = new Chance();

/**
 * rules that differ only in their 'enabled' value
 */
const setupRules = () => {
  const regoRulesIds = ['cis_1_1_1', 'cis_1_1_2'];
  const ids: string[] = chance.unique(chance.string, regoRulesIds.length);
  const initialRulesSO: Array<SavedObject<PackagePolicyRuleUpdatePayload>> = Array.from(
    { length: ids.length },
    (_, i) => ({
      id: ids[i],
      type: 'csp_rue',
      references: [],
      attributes: {
        enabled: false,
        metadata: { benchmark: { id: 'cis_k8s' }, rego_rule_id: regoRulesIds[i] },
      },
    })
  );
  const updatedRulesSO: Array<SavedObject<PackagePolicyRuleUpdatePayload>> = initialRulesSO.map(
    (rule) => ({
      ...rule,
      attributes: { ...rule.attributes, enabled: true },
    })
  );
  return { updatedRulesSO, initialRulesSO };
};

type CspUpdateRulesConfigMocks = Awaited<ReturnType<typeof getMocks>>;

const getBulkUpdateMock = (
  rules: Array<SavedObject<PackagePolicyRuleUpdatePayload>>
): Array<SavedObject<SavedObjectRuleUpdatePayload>> =>
  rules.map((rule) => ({
    ...rule,
    // Updates to rules SO only include the 'enabled' field
    attributes: { enabled: rule.attributes.enabled },
  }));

const setupRequestMock = (mocks: CspUpdateRulesConfigMocks) => {
  mocks.requestMock.body = {
    package_policy_id: mocks.packagePolicyMock.id,
    rules: mocks.updatedRulesSO.map(({ id, attributes }) => ({ id, enabled: attributes.enabled })),
  };
};

const setupSoClientBulkGetMock = (mocks: CspUpdateRulesConfigMocks) => {
  mocks.cspContext.soClient.bulkGet.mockReturnValue(
    Promise.resolve({ saved_objects: mocks.initialRulesSO })
  );
};

const setupSoClientFindMock = (mocks: CspUpdateRulesConfigMocks) => {
  mocks.cspContext.soClient.find.mockReturnValue(
    Promise.resolve({
      saved_objects: mocks.initialRulesSO,
      total: mocks.initialRulesSO.length,
      per_page: 10,
      page: 1,
    } as SavedObjectsFindResponse<CspRule>)
  );
};

const setupPackagePolicyServiceGetMock = (mocks: CspUpdateRulesConfigMocks) => {
  mocks.packagePolicyServiceMock.get.mockReturnValue(Promise.resolve(mocks.packagePolicyMock));
};

const getMocks = () => {
  const { updatedRulesSO, initialRulesSO } = setupRules();
  const responseMock = httpServerMock.createResponseFactory();
  const requestMock = {
    ...httpServerMock.createKibanaRequest<void, void, UpdateRulesConfigBodySchema>(),
  };
  const contextMock = createCspRequestHandlerContextMock();
  const packagePolicyMock = createPackagePolicyMock();
  const cspContext = contextMock.csp;
  const {
    soClient: soClientMock,
    packagePolicyService: packagePolicyServiceMock,
    esClient: esClientMock,
  } = cspContext;

  return {
    responseMock,
    requestMock,
    contextMock,
    packagePolicyMock,
    soClientMock,
    esClientMock,
    packagePolicyServiceMock,
    cspContext,
    initialRulesSO,
    updatedRulesSO,
  };
};

describe('Update rules configuration API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validate the API route path', async () => {
    const router = httpServiceMock.createRouter();

    defineUpdateRulesConfigRoute(router);

    const [config, _] = router.post.mock.calls[0];

    expect(config.path).toEqual('/internal/cloud_security_posture/update_rules_config');
  });

  it('should accept to a user with fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();

    defineUpdateRulesConfigRoute(router);

    const [_, handler] = router.post.mock.calls[0];

    const mocks = getMocks();
    setupRequestMock(mocks);

    const { contextMock, responseMock, requestMock } = mocks;
    await handler(contextMock, requestMock as KibanaRequest, responseMock);

    expect(responseMock.forbidden).toHaveBeenCalledTimes(0);
  });

  it('should reject to a user without fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();

    defineUpdateRulesConfigRoute(router);
    const [_, handler] = router.post.mock.calls[0];

    const { contextMock, responseMock, requestMock } = getMocks();

    contextMock.fleet = {
      authz: { fleet: { all: false } },
    } as Awaited<CspRequestHandlerContext['fleet']>;

    await handler(contextMock, requestMock as KibanaRequest, responseMock);

    expect(responseMock.forbidden).toHaveBeenCalledTimes(1);
  });

  it('create csp rules config based on activated csp rules', async () => {
    const { updatedRulesSO } = getMocks();

    const cspConfig = createRulesConfig(updatedRulesSO);
    expect(cspConfig).toMatchObject({
      runtime_cfg: {
        activated_rules: {
          cis_k8s: updatedRulesSO.map((rule) => rule.attributes.metadata.rego_rule_id),
        },
      },
    });
  });

  it('create empty csp rules config when all rules are disabled', async () => {
    const { initialRulesSO } = getMocks();

    const cspConfig = createRulesConfig(initialRulesSO);
    expect(cspConfig).toMatchObject({ runtime_cfg: { activated_rules: {} } });
  });

  it('validate adding new runtimeCfg to package policy instance', async () => {
    const packagePolicy = createPackagePolicyMock();
    packagePolicy.vars = { runtimeCfg: { type: 'yaml' } };

    const runtimeCfg = 'runtime_cfg:\n  activated_rules:\n  cis_k8s:\n    - 1.1.1\n    - 1.1.2\n';
    const updatedPackagePolicy = getUpdatedPackagePolicy(packagePolicy, runtimeCfg);
    expect(updatedPackagePolicy.vars).toEqual({ runtimeCfg: { type: 'yaml', value: runtimeCfg } });
  });

  it('validate adding new runtimeCfg to package policy instance when it not exists on source', async () => {
    const packagePolicy = createPackagePolicyMock();

    const runtimeCfg = 'runtime_cfg:\n  activated_rules:\n  cis_k8s:\n    - 1.1.1\n    - 1.1.2\n';
    const updatedPackagePolicy = getUpdatedPackagePolicy(packagePolicy, runtimeCfg);
    expect(updatedPackagePolicy.vars).toEqual({ runtimeCfg: { type: 'yaml', value: runtimeCfg } });
  });

  it('updates saved-object rules', async () => {
    const mocks = getMocks();

    setupRequestMock(mocks);
    setupSoClientBulkGetMock(mocks);
    setupSoClientFindMock(mocks);
    setupPackagePolicyServiceGetMock(mocks);

    const { updatedRulesSO, requestMock, packagePolicyMock, soClientMock, cspContext } = mocks;

    await updatePackagePolicyCspRules(cspContext, packagePolicyMock, requestMock.body.rules);

    expect(soClientMock.bulkUpdate).toBeCalledWith(getBulkUpdateMock(updatedRulesSO));
  });

  it('verify that the API for updating package policy was invoked', async () => {
    const mocks = getMocks();

    setupRequestMock(mocks);
    setupSoClientBulkGetMock(mocks);
    setupSoClientFindMock(mocks);
    setupPackagePolicyServiceGetMock(mocks);

    const { esClientMock, soClientMock, packagePolicyMock, packagePolicyServiceMock, cspContext } =
      mocks;
    packagePolicyServiceMock.update.mockReturnValue(Promise.resolve(packagePolicyMock));

    const updatedPackagePolicy = await updatePackagePolicyRuntimeCfgVar({
      rules: mocks.updatedRulesSO,
      packagePolicy: packagePolicyMock,
      soClient: soClientMock,
      esClient: esClientMock.asCurrentUser,
      packagePolicyService: packagePolicyServiceMock,
      user: cspContext.user,
    });

    expect(packagePolicyServiceMock.update).toHaveBeenCalled();
    const { id, ...updatedPackagePolicyWithoutRevisionId } = updatedPackagePolicy;
    expect(packagePolicyServiceMock.update.mock.calls[0][3]).toMatchObject(
      updatedPackagePolicyWithoutRevisionId
    );
  });

  it("updates to package policy vars doesn't override unknown vars", async () => {
    const mocks = getMocks();

    setupRequestMock(mocks);
    setupSoClientBulkGetMock(mocks);
    setupSoClientFindMock(mocks);
    setupPackagePolicyServiceGetMock(mocks);

    const { esClientMock, soClientMock, packagePolicyMock, packagePolicyServiceMock, cspContext } =
      mocks;

    const dummyVar = { type: 'ymal', value: 'foo ' };
    packagePolicyMock.vars = { runtimeCfg: { type: 'yaml' }, foo: { ...dummyVar } };
    packagePolicyServiceMock.update.mockReturnValue(Promise.resolve(packagePolicyMock));

    const updatedPackagePolicy = await updatePackagePolicyRuntimeCfgVar({
      rules: mocks.updatedRulesSO,
      packagePolicy: packagePolicyMock,
      soClient: soClientMock,
      esClient: esClientMock.asCurrentUser,
      packagePolicyService: packagePolicyServiceMock,
      user: cspContext.user,
    });

    expect(updatedPackagePolicy.vars!.foo).toEqual(dummyVar);
    expect(updatedPackagePolicy.vars!.runtimeCfg).toBeDefined();
  });

  it('attempts to rollback rules saved-object when package policy update failed', async () => {
    const mocks = getMocks();

    setupRequestMock(mocks);
    setupSoClientBulkGetMock(mocks);
    setupSoClientFindMock(mocks);
    setupPackagePolicyServiceGetMock(mocks);

    const {
      updatedRulesSO,
      initialRulesSO,
      requestMock,
      soClientMock,
      packagePolicyMock,
      packagePolicyServiceMock,
      cspContext,
    } = mocks;

    packagePolicyServiceMock.update.mockReturnValue(Promise.reject('some error'));

    try {
      await updatePackagePolicyCspRules(cspContext, packagePolicyMock, requestMock.body.rules);
    } catch (e) {
      expect(soClientMock.bulkUpdate).toHaveBeenNthCalledWith(1, getBulkUpdateMock(updatedRulesSO));
      expect(soClientMock.bulkUpdate).toHaveBeenNthCalledWith(2, initialRulesSO);
    }
  });

  it('updates package policy as authenticated user', async () => {
    const mocks = getMocks();

    setupRequestMock(mocks);
    setupSoClientBulkGetMock(mocks);
    setupSoClientFindMock(mocks);
    setupPackagePolicyServiceGetMock(mocks);

    const { requestMock, packagePolicyMock, packagePolicyServiceMock, cspContext } = mocks;

    packagePolicyServiceMock.update.mockReturnValue(Promise.resolve(packagePolicyMock));

    await updatePackagePolicyCspRules(cspContext, packagePolicyMock, requestMock.body.rules);

    expect(packagePolicyServiceMock.update.mock.calls[0][4]).toMatchObject({
      user: cspContext.user,
    });
  });

  it('handles failed rules saved object update', async () => {
    const mocks = getMocks();

    setupRequestMock(mocks);
    setupSoClientBulkGetMock(mocks);
    setupSoClientFindMock(mocks);
    setupPackagePolicyServiceGetMock(mocks);

    const { requestMock, responseMock, soClientMock, contextMock, packagePolicyServiceMock } =
      mocks;

    const message = 'some error';
    soClientMock.bulkUpdate.mockReturnValue(Promise.reject(message));

    try {
      await updateRulesConfigurationHandler(
        contextMock as unknown as CspRequestHandlerContext,
        requestMock,
        responseMock
      );
    } catch (e) {
      expect(packagePolicyServiceMock.update).not.toHaveBeenCalled();
      expect(responseMock.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          message,
        })
      );
    }
  });

  it('handles failed rules package policy update', async () => {
    const mocks = getMocks();

    setupRequestMock(mocks);
    setupSoClientBulkGetMock(mocks);
    setupSoClientFindMock(mocks);
    setupPackagePolicyServiceGetMock(mocks);

    const { requestMock, responseMock, packagePolicyServiceMock, contextMock } = mocks;

    const message = 'some error';
    packagePolicyServiceMock.update.mockReturnValue(Promise.reject(message));

    try {
      await updateRulesConfigurationHandler(
        contextMock as unknown as CspRequestHandlerContext,
        requestMock,
        responseMock
      );
    } catch (e) {
      expect(responseMock.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          message,
        })
      );
    }
  });

  it('throws a 404 Saved-Object Error when packagePolicyService returns a null', async () => {
    const mocks = getMocks();
    setupRequestMock(mocks);

    mocks.packagePolicyServiceMock.get.mockReturnValue(Promise.resolve(null));
    const { requestMock, responseMock, contextMock } = mocks;

    try {
      await updateRulesConfigurationHandler(
        contextMock as unknown as CspRequestHandlerContext,
        requestMock,
        responseMock
      );
    } catch (e) {
      expect(responseMock.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
        })
      );
    }
  });
});
