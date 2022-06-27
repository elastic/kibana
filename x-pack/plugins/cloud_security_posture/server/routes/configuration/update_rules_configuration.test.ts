/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';
import {
  savedObjectsClientMock,
  httpServiceMock,
  loggingSystemMock,
  httpServerMock,
} from '@kbn/core/server/mocks';
import {
  createRulesConfig,
  defineUpdateRulesConfigRoute,
  getCspRules,
  setVarToPackagePolicy,
  updateAgentConfiguration,
} from './update_rules_configuration';

import { CspAppService } from '../../lib/csp_app_services';
import { CspAppContext } from '../../plugin';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { createPackagePolicyServiceMock } from '@kbn/fleet-plugin/server/mocks';

import { CSP_RULE_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { CspRuleType } from '../../../common/schemas';

import {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { Chance } from 'chance';
import { PackagePolicy, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { mockAuthenticatedUser } from '@kbn/security-plugin/common/model/authenticated_user.mock';
import { DeepPartial } from 'utility-types';

describe('Update rules configuration API', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;
  const chance = new Chance();

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    jest.clearAllMocks();
  });

  it('validate the API route path', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
      security: securityMock.createSetup(),
    };
    defineUpdateRulesConfigRoute(router, cspContext);

    const [config, _] = router.post.mock.calls[0];

    expect(config.path).toEqual('/internal/cloud_security_posture/update_rules_config');
  });

  it('should accept to a user with fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
      security: securityMock.createSetup(),
    };
    defineUpdateRulesConfigRoute(router, cspContext);
    const [_, handler] = router.post.mock.calls[0];

    const mockContext = {
      fleet: { authz: { fleet: { all: true } } },
    } as unknown as KibanaRequest;

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });

  it('should reject to a user without fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
      security: securityMock.createSetup(),
    };
    defineUpdateRulesConfigRoute(router, cspContext);
    const [_, handler] = router.post.mock.calls[0];

    const mockContext = {
      fleet: { authz: { fleet: { all: true } } },
    } as unknown as KibanaRequest;

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });

  it('validate getCspRules input parameters', async () => {
    const packagePolicy = createPackagePolicyMock();
    mockSoClient = savedObjectsClientMock.create();
    mockSoClient.find.mockResolvedValueOnce({} as SavedObjectsFindResponse);
    await getCspRules(mockSoClient, packagePolicy);
    expect(mockSoClient.find).toBeCalledTimes(1);
    expect(mockSoClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ type: CSP_RULE_SAVED_OBJECT_TYPE })
    );
  });

  it('create csp rules config based on activated csp rules', async () => {
    const cspRules: DeepPartial<SavedObjectsFindResponse<CspRuleType>> = {
      page: 1,
      per_page: 1000,
      total: 2,
      saved_objects: [
        {
          type: 'csp_rule',
          attributes: {
            enabled: true,
            metadata: {
              rego_rule_id: 'cis_1_1_1',
            },
          },
        },
        {
          type: 'csp_rule',
          attributes: {
            enabled: false,
            metadata: {
              rego_rule_id: 'cis_1_1_2',
            },
          },
        },
        {
          type: 'csp_rule',
          attributes: {
            enabled: true,
            metadata: {
              rego_rule_id: 'cis_1_1_3',
            },
          },
        },
      ],
    };
    const cspConfig = await createRulesConfig(cspRules as SavedObjectsFindResponse<CspRuleType>);
    expect(cspConfig).toMatchObject({
      data_yaml: { activated_rules: { cis_k8s: ['cis_1_1_1', 'cis_1_1_3'] } },
    });
  });

  it('create empty csp rules config when all rules are disabled', async () => {
    const cspRules: DeepPartial<SavedObjectsFindResponse<CspRuleType>> = {
      page: 1,
      per_page: 1000,
      total: 2,
      saved_objects: [
        {
          type: 'csp_rule',
          attributes: {
            enabled: false,
            metadata: {
              rego_rule_id: 'cis_1_1_1',
            },
          },
        },
        {
          type: 'csp_rule',
          attributes: {
            enabled: false,
            metadata: {
              rego_rule_id: 'cis_1_1_2',
            },
          },
        },
        {
          type: 'csp_rule',
          attributes: {
            enabled: false,
            metadata: {
              rego_rule_id: 'cis_1_1_3',
            },
          },
        },
      ],
    };
    const cspConfig = await createRulesConfig(cspRules as SavedObjectsFindResponse<CspRuleType>);
    expect(cspConfig).toMatchObject({ data_yaml: { activated_rules: { cis_k8s: [] } } });
  });

  it('validate adding new dataYaml to package policy instance', async () => {
    const packagePolicy = createPackagePolicyMock();
    packagePolicy.vars = { dataYaml: { type: 'yaml' } };

    const dataYaml = 'data_yaml:\n  activated_rules:\n  cis_k8s:\n    - 1.1.1\n    - 1.1.2\n';
    const updatedPackagePolicy = setVarToPackagePolicy(packagePolicy, dataYaml);
    expect(updatedPackagePolicy.vars).toEqual({ dataYaml: { type: 'yaml', value: dataYaml } });
  });

  it('validate adding new dataYaml to package policy instance when it not exists on source', async () => {
    const packagePolicy = createPackagePolicyMock();

    const dataYaml = 'data_yaml:\n  activated_rules:\n  cis_k8s:\n    - 1.1.1\n    - 1.1.2\n';
    const updatedPackagePolicy = setVarToPackagePolicy(packagePolicy, dataYaml);
    expect(updatedPackagePolicy.vars).toEqual({ dataYaml: { type: 'yaml', value: dataYaml } });
  });

  it('verify that the API for updating package policy was invoked', async () => {
    mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockSoClient = savedObjectsClientMock.create();
    const mockPackagePolicyService = createPackagePolicyServiceMock();

    mockPackagePolicyService.update.mockImplementation(
      (
        soClient: SavedObjectsClientContract,
        esClient: ElasticsearchClient,
        id: string,
        packagePolicyUpdate: UpdatePackagePolicy
      ): Promise<PackagePolicy> => {
        // @ts-expect-error 2322
        return packagePolicyUpdate;
      }
    );

    const cspRules: DeepPartial<SavedObjectsFindResponse<CspRuleType>> = {
      page: 1,
      per_page: 1000,
      total: 2,
      saved_objects: [
        {
          type: 'csp_rule',
          attributes: {
            enabled: false,
            metadata: {
              rego_rule_id: 'cis_1_1_1',
            },
          },
        },
        {
          type: 'csp_rule',
          attributes: {
            enabled: false,
            metadata: {
              rego_rule_id: 'cis_1_1_2',
            },
          },
        },
        {
          type: 'csp_rule',
          attributes: {
            enabled: false,
            metadata: {
              rego_rule_id: 'cis_1_1_3',
            },
          },
        },
      ],
    };
    mockSoClient.find.mockResolvedValueOnce(cspRules as SavedObjectsFindResponse<CspRuleType>);

    const mockPackagePolicy = createPackagePolicyMock();
    mockPackagePolicy.vars = { dataYaml: { type: 'foo' } };
    const packagePolicyId1 = chance.guid();
    mockPackagePolicy.id = packagePolicyId1;

    const user = null;

    const updatePackagePolicy = await updateAgentConfiguration(
      mockPackagePolicyService,
      mockPackagePolicy,
      mockEsClient,
      mockSoClient,
      user
    );

    expect(updatePackagePolicy.vars!.dataYaml).toHaveProperty('value');
    expect(updatePackagePolicy.vars!.dataYaml).toMatchObject({ type: 'yaml' });
    expect(mockPackagePolicyService.update).toBeCalledTimes(1);
    expect(mockPackagePolicyService.update.mock.calls[0][2]).toEqual(packagePolicyId1);
  });

  it('validate updateAgentConfiguration not override vars', async () => {
    mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockSoClient = savedObjectsClientMock.create();
    const mockPackagePolicyService = createPackagePolicyServiceMock();

    const cspRules: DeepPartial<SavedObjectsFindResponse<CspRuleType>> = {
      page: 1,
      per_page: 1000,
      total: 2,
      saved_objects: [
        {
          type: 'csp_rule',
          attributes: {
            enabled: false,
            metadata: {
              rego_rule_id: 'cis_1_1_1',
            },
          },
        },
        {
          type: 'csp_rule',
          attributes: {
            enabled: false,
            metadata: {
              rego_rule_id: 'cis_1_1_2',
            },
          },
        },
        {
          type: 'csp_rule',
          attributes: {
            enabled: false,
            metadata: {
              rego_rule_id: 'cis_1_1_3',
            },
          },
        },
      ],
    };
    mockSoClient.find.mockResolvedValueOnce(cspRules as SavedObjectsFindResponse<CspRuleType>);

    const mockPackagePolicy = createPackagePolicyMock();
    const packagePolicyId1 = chance.guid();
    const user = null;
    mockPackagePolicy.id = packagePolicyId1;
    mockPackagePolicy.vars = { foo: {}, dataYaml: { type: 'yaml' } };

    mockPackagePolicyService.update.mockImplementation(
      (
        soClient: SavedObjectsClientContract,
        esClient: ElasticsearchClient,
        id: string,
        packagePolicyUpdate: UpdatePackagePolicy
      ): Promise<PackagePolicy> => {
        // @ts-expect-error 2322
        return packagePolicyUpdate;
      }
    );

    const updatedPackagePolicy = await updateAgentConfiguration(
      mockPackagePolicyService,
      mockPackagePolicy,
      mockEsClient,
      mockSoClient,
      user
    );

    expect(mockPackagePolicyService.update).toBeCalledTimes(1);
    expect(updatedPackagePolicy.vars).toHaveProperty('foo');
  });

  it('validate updateAgentConfiguration passes user to the package update method', async () => {
    mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockSoClient = savedObjectsClientMock.create();

    const mockPackagePolicyService = createPackagePolicyServiceMock();
    const mockPackagePolicy = createPackagePolicyMock();
    const user = mockAuthenticatedUser();

    const cspRules: DeepPartial<SavedObjectsFindResponse<CspRuleType>> = {
      page: 1,
      per_page: 1000,
      total: 2,
      saved_objects: [
        {
          type: 'csp_rule',
          attributes: {
            enabled: false,
            metadata: {
              rego_rule_id: 'cis_1_1_1',
            },
          },
        },
      ],
    };
    mockSoClient.find.mockResolvedValueOnce(cspRules as SavedObjectsFindResponse<CspRuleType>);

    mockPackagePolicy.vars = { dataYaml: { type: 'yaml' } };

    await updateAgentConfiguration(
      mockPackagePolicyService,
      mockPackagePolicy,
      mockEsClient,
      mockSoClient,
      user
    );
    expect(mockPackagePolicyService.update.mock.calls[0][4]).toMatchObject({ user });
  });
});
