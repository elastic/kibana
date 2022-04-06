/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import {
  savedObjectsClientMock,
  httpServiceMock,
  loggingSystemMock,
  httpServerMock,
} from 'src/core/server/mocks';
import {
  convertRulesConfigToYaml,
  createRulesConfig,
  defineUpdateRulesConfigRoute,
  getCspRules,
  setVarToPackagePolicy,
  updatePackagePolicy,
} from './update_rules_configuration';

import { CspAppService } from '../../lib/csp_app_services';
import { CspAppContext } from '../../plugin';
import { createPackagePolicyMock } from '../../../../fleet/common/mocks';
import { createPackagePolicyServiceMock } from '../../../../fleet/server/mocks';

import { cspRuleAssetSavedObjectType, CspRuleSchema } from '../../../common/schemas/csp_rule';
import {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from 'kibana/server';
import { Chance } from 'chance';

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
    };
    defineUpdateRulesConfigRoute(router, cspContext);

    const [config, _] = router.post.mock.calls[0];

    expect(config.path).toEqual('/api/csp/update_rules_config');
  });

  it('should accept to a user with fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
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
    mockSoClient = savedObjectsClientMock.create();
    mockSoClient.find.mockResolvedValueOnce({} as SavedObjectsFindResponse);
    await getCspRules(mockSoClient);
    expect(mockSoClient.find).toBeCalledTimes(1);
    expect(mockSoClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ type: cspRuleAssetSavedObjectType })
    );
  });

  it('create csp rules config based on activated csp rules', async () => {
    const cspRules = {
      page: 1,
      per_page: 1000,
      total: 2,
      saved_objects: [
        {
          type: 'csp_rule',
          id: '1.1.1',
          attributes: { enabled: true },
        },
        {
          type: 'csp_rule',
          id: '1.1.2',
          attributes: { enabled: false },
        },
        {
          type: 'csp_rule',
          id: '1.1.3',
          attributes: { enabled: true },
        },
      ],
    } as SavedObjectsFindResponse<CspRuleSchema>;
    const cspConfig = await createRulesConfig(cspRules);
    expect(cspConfig).toMatchObject({ activated_rules: { cis_k8s: ['1.1.1', '1.1.3'] } });
  });

  it('create empty csp rules config when all rules are disabled', async () => {
    const cspRules = {
      page: 1,
      per_page: 1000,
      total: 2,
      saved_objects: [
        {
          type: 'csp_rule',
          id: '1.1.1',
          attributes: { enabled: false },
        },
        {
          type: 'csp_rule',
          id: '1.1.2',
          attributes: { enabled: false },
        },
      ],
    } as SavedObjectsFindResponse<CspRuleSchema>;
    const cspConfig = await createRulesConfig(cspRules);
    expect(cspConfig).toMatchObject({ activated_rules: { cis_k8s: [] } });
  });

  it('validate converting rules config object to Yaml', async () => {
    const cspRuleConfig = { activated_rules: { cis_k8s: ['1.1.1', '1.1.2'] } };

    const dataYaml = convertRulesConfigToYaml(cspRuleConfig);

    expect(dataYaml).toEqual('activated_rules:\n  cis_k8s:\n    - 1.1.1\n    - 1.1.2\n');
  });

  it('validate adding new data.yaml to package policy instance', async () => {
    const packagePolicy = createPackagePolicyMock();

    const dataYaml = 'activated_rules:\n  cis_k8s:\n    - 1.1.1\n    - 1.1.2\n';
    const updatedPackagePolicy = setVarToPackagePolicy(packagePolicy, dataYaml);

    expect(updatedPackagePolicy.vars).toEqual({ dataYaml: { type: 'config', value: dataYaml } });
  });

  it('validate updatePackagePolicy is called with the right parameters', async () => {
    mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockSoClient = savedObjectsClientMock.create();
    const mockPackagePolicyService = createPackagePolicyServiceMock();

    const packagePolicyId1 = chance.guid();
    const packagePolicyId2 = chance.guid();
    const mockPackagePolicy1 = createPackagePolicyMock();
    const mockPackagePolicy2 = createPackagePolicyMock();
    mockPackagePolicy1.id = packagePolicyId1;
    mockPackagePolicy2.id = packagePolicyId2;
    const packagePolicies = mockPackagePolicy1;

    const dataYaml = 'activated_rules:\n  cis_k8s:\n    - 1.1.1\n    - 1.1.2\n';

    await updatePackagePolicy(
      mockPackagePolicyService,
      packagePolicies,
      mockEsClient,
      mockSoClient,
      dataYaml
    );

    expect(mockPackagePolicyService.update).toBeCalledTimes(1);
    expect(mockPackagePolicyService.update.mock.calls[0][2]).toEqual(packagePolicyId1);
  });
});
