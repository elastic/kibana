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
  UpdateRulesConfigBodySchema,
  updateRulesConfigurationHandler,
  type PackagePolicyRuleUpdatePayload,
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
  const disabledRules: Array<SavedObject<PackagePolicyRuleUpdatePayload>> = Array.from(
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
  const enabledRules: Array<SavedObject<PackagePolicyRuleUpdatePayload>> = disabledRules.map(
    (rule) => ({
      ...rule,
      attributes: { ...rule.attributes, enabled: true },
    })
  );
  return { enabledRules, disabledRules };
};

type CspUpdateRulesConfigMocks = Awaited<ReturnType<typeof getMocks>>;

const setupRequestMock = (mocks: CspUpdateRulesConfigMocks) => {
  mocks.requestMock.body = {
    package_policy_id: mocks.packagePolicyMock.id,
    rules: mocks.enabledRules.map(({ id, attributes }) => ({ id, enabled: attributes.enabled })),
  };
};

const setupPackagePolicyVarsMock = (mocks: CspUpdateRulesConfigMocks) => {
  mocks.packagePolicyMock.vars = { runtimeCfg: { type: 'yaml' } };
};

const setupSoClientBulkGetMock = (mocks: CspUpdateRulesConfigMocks) => {
  mocks.cspContext.soClient.bulkGet.mockReturnValue(
    Promise.resolve({ saved_objects: mocks.disabledRules })
  );
};

const setupSoClientFindMock = (mocks: CspUpdateRulesConfigMocks) => {
  mocks.cspContext.soClient.find.mockReturnValue(
    Promise.resolve({
      saved_objects: mocks.disabledRules,
      total: mocks.disabledRules.length,
      per_page: 10,
      page: 1,
    } as SavedObjectsFindResponse<CspRule>)
  );
};

const setupPackagePolicyServiceGetMock = (mocks: CspUpdateRulesConfigMocks) => {
  mocks.packagePolicyServiceMock.get.mockReturnValue(Promise.resolve(mocks.packagePolicyMock));
};

const getMocks = () => {
  const { enabledRules, disabledRules } = setupRules();
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
    disabledRules,
    enabledRules,
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
    const { enabledRules } = getMocks();

    const cspConfig = createRulesConfig(enabledRules);
    expect(cspConfig).toMatchObject({
      runtime_cfg: {
        activated_rules: {
          cis_k8s: enabledRules.map((rule) => rule.attributes.metadata.rego_rule_id),
        },
      },
    });
  });

  it('create empty csp rules config when all rules are disabled', async () => {
    const { disabledRules } = getMocks();

    const cspConfig = createRulesConfig(disabledRules);
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

    const { enabledRules, requestMock, packagePolicyMock, soClientMock, cspContext } = mocks;

    await updatePackagePolicyCspRules(cspContext, packagePolicyMock, requestMock.body.rules);

    expect(soClientMock.bulkUpdate).toBeCalledWith(enabledRules);
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
      rules: mocks.enabledRules,
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
    setupPackagePolicyVarsMock(mocks);
    setupPackagePolicyServiceGetMock(mocks);

    const { esClientMock, soClientMock, packagePolicyMock, packagePolicyServiceMock, cspContext } =
      mocks;

    const dummyVar = { type: 'ymal', value: 'foo ' };
    packagePolicyMock.vars!.foo = { ...dummyVar };
    packagePolicyServiceMock.update.mockReturnValue(Promise.resolve(packagePolicyMock));

    const updatedPackagePolicy = await updatePackagePolicyRuntimeCfgVar({
      rules: mocks.enabledRules,
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
      enabledRules,
      disabledRules,
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
      expect(soClientMock.bulkUpdate).toHaveBeenNthCalledWith(1, enabledRules);
      expect(soClientMock.bulkUpdate).toHaveBeenNthCalledWith(2, disabledRules);
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

    const { requestMock, responseMock, soClientMock, contextMock } = mocks;

    const message = 'some error';
    soClientMock.bulkUpdate.mockReturnValue(Promise.reject(message));

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
          message: `Saved object [ingest-package-policies/${requestMock.body.package_policy_id}] not found`,
        })
      );
    }
  });
});
