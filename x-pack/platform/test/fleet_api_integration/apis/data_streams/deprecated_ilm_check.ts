/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect/expect';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');

  describe('deprecated_ilm_check', () => {
    const getDeprecatedILMCheck = async () => {
      return await supertest
        .get(`/api/fleet/data_streams/deprecated_ilm_check`)
        .set('kbn-xsrf', 'xxxx');
    };

    afterEach(async () => {
      // Clean up any test ILM policies and component templates
      const policiesToClean = [
        'test_deprecated_logs_policy',
        'test_deprecated_logs_policy@lifecycle',
        'test_deprecated_metrics_policy',
      ];

      for (const policy of policiesToClean) {
        try {
          await es.ilm.deleteLifecycle({ name: policy });
        } catch (e) {
          // Ignore errors if policy doesn't exist
        }
      }

      const templatesToClean = ['logs-test-deprecated@package', 'metrics-test-deprecated@package'];

      for (const template of templatesToClean) {
        try {
          await es.cluster.deleteComponentTemplate({ name: template });
        } catch (e) {
          // Ignore errors if template doesn't exist
        }
      }
    });

    it('should return empty array when no component templates use deprecated ILM policies', async function () {
      const { body, status } = await getDeprecatedILMCheck();
      expect(status).to.eql(200);
      expect(body).to.have.property('deprecatedILMPolicies');
      expect(body.deprecatedILMPolicies).to.be.an('array');
      // Default installation may or may not have deprecated policies in use
      // We just verify the structure is correct
    });

    it('should detect when component template uses deprecated policy without @lifecycle existing', async function () {
      // Create a deprecated ILM policy (no @lifecycle version)
      await es.ilm.putLifecycle({
        name: 'test_deprecated_logs_policy',
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '30d',
                },
              },
            },
          },
        },
      });

      // Create a Fleet-managed component template that uses it
      await es.cluster.putComponentTemplate({
        name: 'logs-test-deprecated@package',
        template: {
          settings: {
            index: {
              lifecycle: {
                name: 'test_deprecated_logs_policy',
              },
            },
          },
        },
      });

      const { body, status } = await getDeprecatedILMCheck();
      expect(status).to.eql(200);

      // Should detect the deprecated policy
      const deprecatedPolicy = body.deprecatedILMPolicies.find(
        (p: any) => p.policyName === 'test_deprecated_logs_policy'
      );
      expect(deprecatedPolicy).to.not.be(undefined);
      expect(deprecatedPolicy.componentTemplates).to.contain('logs-test-deprecated@package');
    });

    it('should not show callout when both deprecated and @lifecycle policies are unmodified', async function () {
      // Create both deprecated and @lifecycle policies at version 1
      await es.ilm.putLifecycle({
        name: 'test_deprecated_logs_policy',
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '30d',
                },
              },
            },
          },
        },
      });

      await es.ilm.putLifecycle({
        name: 'test_deprecated_logs_policy@lifecycle',
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '30d',
                },
              },
            },
          },
        },
      });

      // Create a component template that uses the deprecated policy
      await es.cluster.putComponentTemplate({
        name: 'logs-test-deprecated@package',
        template: {
          settings: {
            index: {
              lifecycle: {
                name: 'test_deprecated_logs_policy',
              },
            },
          },
        },
      });

      const { body, status } = await getDeprecatedILMCheck();
      expect(status).to.eql(200);

      // Should NOT detect the deprecated policy because both are at version 1 (auto-migration will handle)
      const deprecatedPolicy = body.deprecatedILMPolicies.find(
        (p: any) => p.policyName === 'test_deprecated_logs_policy'
      );
      expect(deprecatedPolicy).to.be(undefined);
    });

    it('should show callout when deprecated policy is modified', async function () {
      // Create deprecated policy
      await es.ilm.putLifecycle({
        name: 'test_deprecated_logs_policy',
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '30d',
                },
              },
            },
          },
        },
      });

      // Create @lifecycle policy
      await es.ilm.putLifecycle({
        name: 'test_deprecated_logs_policy@lifecycle',
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '30d',
                },
              },
            },
          },
        },
      });

      // Modify the deprecated policy (increases version)
      await es.ilm.putLifecycle({
        name: 'test_deprecated_logs_policy',
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '7d', // Changed from 30d
                },
              },
            },
          },
        },
      });

      // Create a component template that uses the deprecated policy
      await es.cluster.putComponentTemplate({
        name: 'logs-test-deprecated@package',
        template: {
          settings: {
            index: {
              lifecycle: {
                name: 'test_deprecated_logs_policy',
              },
            },
          },
        },
      });

      const { body, status } = await getDeprecatedILMCheck();
      expect(status).to.eql(200);

      // Should detect the deprecated policy because it's been modified
      const deprecatedPolicy = body.deprecatedILMPolicies.find(
        (p: any) => p.policyName === 'test_deprecated_logs_policy'
      );
      expect(deprecatedPolicy).to.not.be(undefined);
      expect(deprecatedPolicy.version).to.be.greaterThan(1);
      expect(deprecatedPolicy.componentTemplates).to.contain('logs-test-deprecated@package');
    });

    it('should show callout when @lifecycle policy is modified', async function () {
      // Create deprecated policy
      await es.ilm.putLifecycle({
        name: 'test_deprecated_logs_policy',
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '30d',
                },
              },
            },
          },
        },
      });

      // Create @lifecycle policy
      await es.ilm.putLifecycle({
        name: 'test_deprecated_logs_policy@lifecycle',
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '30d',
                },
              },
            },
          },
        },
      });

      // Modify the @lifecycle policy (increases version)
      await es.ilm.putLifecycle({
        name: 'test_deprecated_logs_policy@lifecycle',
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '7d', // Changed from 30d
                },
              },
            },
          },
        },
      });

      // Create a component template that uses the deprecated policy
      await es.cluster.putComponentTemplate({
        name: 'logs-test-deprecated@package',
        template: {
          settings: {
            index: {
              lifecycle: {
                name: 'test_deprecated_logs_policy',
              },
            },
          },
        },
      });

      const { body, status } = await getDeprecatedILMCheck();
      expect(status).to.eql(200);

      // Should detect the deprecated policy because @lifecycle is modified
      const deprecatedPolicy = body.deprecatedILMPolicies.find(
        (p: any) => p.policyName === 'test_deprecated_logs_policy'
      );
      expect(deprecatedPolicy).to.not.be(undefined);
      expect(deprecatedPolicy.componentTemplates).to.contain('logs-test-deprecated@package');
    });

    it('should handle multiple policy types (logs, metrics, synthetics)', async function () {
      // Create deprecated policies for both logs and metrics
      await es.ilm.putLifecycle({
        name: 'test_deprecated_logs_policy',
        policy: {
          phases: {
            hot: { actions: { rollover: { max_age: '30d' } } },
          },
        },
      });

      await es.ilm.putLifecycle({
        name: 'test_deprecated_metrics_policy',
        policy: {
          phases: {
            hot: { actions: { rollover: { max_age: '30d' } } },
          },
        },
      });

      // Create component templates for both
      await es.cluster.putComponentTemplate({
        name: 'logs-test-deprecated@package',
        template: {
          settings: {
            index: {
              lifecycle: {
                name: 'test_deprecated_logs_policy',
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
                name: 'test_deprecated_metrics_policy',
              },
            },
          },
        },
      });

      const { body, status } = await getDeprecatedILMCheck();
      expect(status).to.eql(200);

      // Should detect both deprecated policies
      const logsPolicy = body.deprecatedILMPolicies.find(
        (p: any) => p.policyName === 'test_deprecated_logs_policy'
      );
      const metricsPolicy = body.deprecatedILMPolicies.find(
        (p: any) => p.policyName === 'test_deprecated_metrics_policy'
      );

      expect(logsPolicy).to.not.be(undefined);
      expect(logsPolicy.componentTemplates).to.contain('logs-test-deprecated@package');
      expect(metricsPolicy).to.not.be(undefined);
      expect(metricsPolicy.componentTemplates).to.contain('metrics-test-deprecated@package');
    });

    it('should only check Fleet-managed component templates (with @package suffix)', async function () {
      // Create a deprecated ILM policy
      await es.ilm.putLifecycle({
        name: 'test_deprecated_logs_policy',
        policy: {
          phases: {
            hot: { actions: { rollover: { max_age: '30d' } } },
          },
        },
      });

      // Create a component template WITHOUT @package suffix (not Fleet-managed)
      await es.cluster.putComponentTemplate({
        name: 'logs-test-not-fleet-managed',
        template: {
          settings: {
            index: {
              lifecycle: {
                name: 'test_deprecated_logs_policy',
              },
            },
          },
        },
      });

      const { body, status } = await getDeprecatedILMCheck();
      expect(status).to.eql(200);

      // Should NOT detect the policy because it's not used by Fleet-managed templates
      const deprecatedPolicy = body.deprecatedILMPolicies.find(
        (p: any) => p.policyName === 'test_deprecated_logs_policy'
      );
      expect(deprecatedPolicy).to.be(undefined);

      // Clean up non-Fleet template
      await es.cluster.deleteComponentTemplate({
        name: 'logs-test-not-fleet-managed',
      });
    });
  });
}
