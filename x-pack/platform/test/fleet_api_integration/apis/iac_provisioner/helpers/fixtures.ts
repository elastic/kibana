/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderIacTemplateIntegration } from '@kbn/fleet-plugin/common/types/rest_spec/iac_provisioner';
import type { Agent as SuperTestAgent } from 'supertest';
import { v4 as uuidv4 } from 'uuid';

/** Headers every call to the internal, versioned Fleet routes needs. */
export const INTERNAL_ROUTE_HEADERS = {
  'kbn-xsrf': 'xxxx',
  'elastic-api-version': '1',
  'x-elastic-internal-origin': 'kibana',
};

export const RENDER_TEMPLATE_PATH = '/internal/fleet/iac_provisioner/render_template';

export const verifyIacKeyPath = (cloudConnectorId: string) =>
  `/internal/fleet/cloud_connectors/${cloudConnectorId}/verify_iac_key`;

/**
 * The test registry's `test_agentless` package: one policy template (`sample`) with one input
 * (`httpjson`). Attaching it to a connector yields exactly {@link TEST_PACKAGE_INTEGRATION_SET}.
 */
export const TEST_PACKAGE = {
  name: 'test_agentless',
  version: '1.0.0',
  policyTemplate: 'sample',
  inputType: 'httpjson',
};

export const TEST_PACKAGE_INTEGRATION_SET: RenderIacTemplateIntegration[] = [
  {
    name: TEST_PACKAGE.name,
    policyTemplates: [
      { name: TEST_PACKAGE.policyTemplate, enabledInputs: [TEST_PACKAGE.inputType] },
    ],
  },
];

/** The same selection with the package version the provisioner client resolves from the registry. */
export const TEST_PACKAGE_PROVISIONER_INTEGRATIONS = TEST_PACKAGE_INTEGRATION_SET.map(
  (integration) => ({ ...integration, version: TEST_PACKAGE.version })
);

/**
 * A second registry package with the same template/input names, used as the "integration being
 * added" in onboarding-shaped requests. It is agentless-only so it never gets a policy here.
 */
export const ADDED_PACKAGE_INTEGRATION: RenderIacTemplateIntegration = {
  name: 'test_agentless_only',
  policyTemplates: [{ name: 'sample', enabledInputs: ['httpjson'] }],
};

export const STORED_IAC_KEY = 'sha256:stored-template-key';

export interface CreateAwsCloudConnectorOptions {
  /** Stored template key; omit for a keyless (static template) connector. */
  iac_key?: string;
  iac_blueprint_id?: string;
  iac_blueprint_version?: string;
  iac_deployment_id?: string;
}

export const createAwsCloudConnector = async (
  supertest: SuperTestAgent,
  iacFields: CreateAwsCloudConnectorOptions = {}
): Promise<string> => {
  const { body } = await supertest
    .post('/api/fleet/cloud_connectors')
    .set('kbn-xsrf', 'xxxx')
    .send({
      name: `arn:aws:iam::123456789012:role/iac-test-role-${uuidv4()}`,
      cloudProvider: 'aws',
      vars: {
        role_arn: { value: 'arn:aws:iam::123456789012:role/iac-test-role', type: 'text' },
        external_id: {
          type: 'password',
          value: { id: 'iacTestExternalId123', isSecretRef: true },
        },
      },
      ...iacFields,
    })
    .expect(200);
  return body.item.id;
};

export const createAzureCloudConnector = async (supertest: SuperTestAgent): Promise<string> => {
  const { body } = await supertest
    .post('/api/fleet/cloud_connectors')
    .set('kbn-xsrf', 'xxxx')
    .send({
      name: `iac-test-azure-connector-${uuidv4()}`,
      cloudProvider: 'azure',
      vars: {
        tenant_id: { type: 'password', value: { id: 'iacTestTenantId12345', isSecretRef: true } },
        client_id: { type: 'password', value: { id: 'iacTestClientId12345', isSecretRef: true } },
        azure_credentials_cloud_connector_id: { value: 'iac-test-azure-id', type: 'text' },
      },
    })
    .expect(200);
  return body.item.id;
};

export const createAgentPolicy = async (supertest: SuperTestAgent): Promise<string> => {
  const { body } = await supertest
    .post('/api/fleet/agent_policies')
    .set('kbn-xsrf', 'xxxx')
    .send({ name: `IaC test agent policy ${uuidv4()}`, namespace: 'default' })
    .expect(200);
  return body.item.id;
};

/** Attaches a `test_agentless` policy to the connector so its integration set is non-empty. */
export const attachTestPackagePolicy = async (
  supertest: SuperTestAgent,
  { agentPolicyId, cloudConnectorId }: { agentPolicyId: string; cloudConnectorId: string }
): Promise<string> => {
  const { body } = await supertest
    .post('/api/fleet/package_policies')
    .set('kbn-xsrf', 'xxxx')
    .send({
      name: `iac-test-package-policy-${uuidv4()}`,
      namespace: 'default',
      policy_ids: [agentPolicyId],
      package: { name: TEST_PACKAGE.name, version: TEST_PACKAGE.version },
      // Only the full-form body accepts cloud_connector_id; the simplified form rejects it.
      cloud_connector_id: cloudConnectorId,
      inputs: [
        {
          type: TEST_PACKAGE.inputType,
          policy_template: TEST_PACKAGE.policyTemplate,
          enabled: true,
          vars: { api_key: { type: 'password', value: 'TEST_VALUE_API_KEY' } },
          streams: [],
        },
      ],
    })
    .expect(200);
  return body.item.id;
};

export const getCloudConnector = async (supertest: SuperTestAgent, cloudConnectorId: string) => {
  const { body } = await supertest
    .get(`/api/fleet/cloud_connectors/${cloudConnectorId}`)
    .expect(200);
  return body.item;
};

/** Integrations one over the shared render cap, all schema-valid. */
export const integrationsOverCap = (max: number): RenderIacTemplateIntegration[] =>
  Array.from({ length: max + 1 }, (_, index) => ({
    name: `pkg_${index}`,
    policyTemplates: [{ name: 'tpl', enabledInputs: ['input'] }],
  }));
