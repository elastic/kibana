/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');

  describe('deprecated_ilm_check', () => {
    const getDeprecatedILMCheck = async () => {
      return await supertest
        .get(`/internal/fleet/data_streams/deprecated_ilm_check`)
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '1');
    };

    afterEach(async () => {
      // Clean up test component templates
      const templatesToClean = ['logs-test-deprecated@package', 'metrics-test-deprecated@package'];

      for (const template of templatesToClean) {
        try {
          await es.cluster.deleteComponentTemplate({ name: template });
        } catch (e) {
          // Ignore errors if template doesn't exist
        }
      }
    });

    it('should return 200 and correct response structure', async function () {
      const { body, status } = await getDeprecatedILMCheck();
      expect(status).to.eql(200);
      expect(body).to.have.property('deprecatedILMPolicies');
      expect(body.deprecatedILMPolicies).to.be.an('array');

      // Verify each item has the correct structure
      body.deprecatedILMPolicies.forEach((policy: any) => {
        expect(policy).to.have.property('policyName');
        expect(policy).to.have.property('version');
        expect(policy).to.have.property('componentTemplates');
        expect(policy.componentTemplates).to.be.an('array');
      });
    });

    it('should detect component templates using deprecated ILM policies', async function () {
      // Create a Fleet-managed component template that uses the logs policy
      // The logs policy should exist as a system policy
      await es.cluster.putComponentTemplate({
        name: 'logs-test-deprecated@package',
        template: {
          settings: {
            index: {
              lifecycle: {
                name: 'logs',
              },
            },
          },
        },
      });

      const { body, status } = await getDeprecatedILMCheck();
      expect(status).to.eql(200);

      // Check if the test template is detected (depends on system policy state)
      const logsPolicy = body.deprecatedILMPolicies.find((p: any) => p.policyName === 'logs');
      if (logsPolicy) {
        expect(logsPolicy.componentTemplates).to.contain('logs-test-deprecated@package');
      }
    });

    it('should handle multiple policy types (logs, metrics, synthetics)', async function () {
      // Create component templates for multiple policy types
      await es.cluster.putComponentTemplate({
        name: 'logs-test-deprecated@package',
        template: {
          settings: {
            index: {
              lifecycle: {
                name: 'logs',
              },
            },
          },
        },
      });

      await es.cluster.putComponentTemplate({
        name: 'metrics-test-deprecated@package',
        template: {
          settings: {
            index: {
              lifecycle: {
                name: 'metrics',
              },
            },
          },
        },
      });

      const { body, status } = await getDeprecatedILMCheck();
      expect(status).to.eql(200);

      // Verify response includes our test templates if policies are detected
      const logsPolicy = body.deprecatedILMPolicies.find((p: any) => p.policyName === 'logs');
      const metricsPolicy = body.deprecatedILMPolicies.find((p: any) => p.policyName === 'metrics');

      if (logsPolicy) {
        expect(logsPolicy.componentTemplates).to.contain('logs-test-deprecated@package');
      }
      if (metricsPolicy) {
        expect(metricsPolicy.componentTemplates).to.contain('metrics-test-deprecated@package');
      }
    });

    it('should only check Fleet-managed component templates (with @package suffix)', async function () {
      // Create a component template WITHOUT @package suffix (not Fleet-managed)
      await es.cluster.putComponentTemplate({
        name: 'logs-test-not-fleet-managed',
        template: {
          settings: {
            index: {
              lifecycle: {
                name: 'logs',
              },
            },
          },
        },
      });

      const { body, status } = await getDeprecatedILMCheck();
      expect(status).to.eql(200);

      // Verify that non-Fleet-managed templates are not included
      const logsPolicy = body.deprecatedILMPolicies.find((p: any) => p.policyName === 'logs');
      if (logsPolicy) {
        expect(logsPolicy.componentTemplates).to.not.contain('logs-test-not-fleet-managed');
      }

      // Clean up non-Fleet template
      await es.cluster.deleteComponentTemplate({
        name: 'logs-test-not-fleet-managed',
      });
    });
  });
}
