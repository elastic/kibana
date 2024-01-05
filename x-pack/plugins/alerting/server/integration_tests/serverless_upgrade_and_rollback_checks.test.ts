/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This test is designed to detect changes to rule parameter schemas on any rule type running in serverless.
 *
 * To make this test pass, you will need to update the failing snapshot.
 *
 * node scripts/jest_integration.js x-pack/plugins/alerting/server/integration_tests/serverless_upgrade_and_rollback_checks.test.ts -u
 *
 * Once the snapshot is updated, it will trigger a codeowner review from the Response Ops team.
 * The Response Ops team will be required to review the changes to ensure the change will work in
 * upgrade and rollback scenario so any alerting rule remains running after a rollback.
 *
 * To facilitate a review, describe in the PR the following:
 *   - Details about the change in parameters
 *   - How users leverage the change
 *   - How the system behaves if a user leverages the change and a rollback occurs afterwards
 *
 * Intermediate releases may be necessary so the param and rule executor changes are released
 * prior to users being able to leverage the new capability. This way if we rollback, the application
 * still understands how to run the alerting rule.
 */
import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { uniq } from 'lodash';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { setupTestServers } from './lib';
import type { RuleTypeRegistry } from '../rule_type_registry';

jest.mock('../rule_type_registry', () => {
  const actual = jest.requireActual('../rule_type_registry');
  return {
    ...actual,
    RuleTypeRegistry: jest.fn().mockImplementation((opts) => {
      return new actual.RuleTypeRegistry(opts);
    }),
  };
});

/**
 * These rule types are manually updated.
 *
 * TODO: We should spin up three serverless projects and pull the rule types
 * directly from them to ensure the list below remains up to date. We will still
 * need a copied list of rule types here because they are needed to write
 * test scenarios below.
 */
const ruleTypesInEsProjects: string[] = [
  '.index-threshold',
  '.geo-containment',
  '.es-query',
  'transform_health',
];
const ruleTypesInObltProjects: string[] = [
  '.index-threshold',
  '.geo-containment',
  '.es-query',
  'transform_health',
  'xpack.ml.anomaly_detection_alert',
  'xpack.ml.anomaly_detection_jobs_health',
  'slo.rules.burnRate',
  'observability.rules.custom_threshold',
  'metrics.alert.inventory.threshold',
  'apm.error_rate',
  'apm.transaction_error_rate',
  'apm.transaction_duration',
  'apm.anomaly',
];
const ruleTypesInSecurityProjects: string[] = [
  '.index-threshold',
  '.geo-containment',
  '.es-query',
  'transform_health',
  'xpack.ml.anomaly_detection_alert',
  'xpack.ml.anomaly_detection_jobs_health',
  'siem.notifications',
  'siem.eqlRule',
  'siem.indicatorRule',
  'siem.mlRule',
  'siem.queryRule',
  'siem.savedQueryRule',
  'siem.thresholdRule',
  'siem.newTermsRule',
];

describe('Serverless upgrade and rollback checks', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let ruleTypeRegistry: RuleTypeRegistry;
  const ruleTypesToCheck: string[] = uniq(
    ruleTypesInEsProjects.concat(ruleTypesInObltProjects).concat(ruleTypesInSecurityProjects)
  );

  beforeAll(async () => {
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    const mockedRuleTypeRegistry = jest.requireMock('../rule_type_registry');
    expect(mockedRuleTypeRegistry.RuleTypeRegistry).toHaveBeenCalledTimes(1);
    ruleTypeRegistry = mockedRuleTypeRegistry.RuleTypeRegistry.mock.results[0].value;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  for (const ruleTypeId of ruleTypesToCheck) {
    test(`detect param changes to review for: ${ruleTypeId}`, async () => {
      const ruleType = ruleTypeRegistry.get(ruleTypeId);
      if (!ruleType?.schemas?.params) {
        throw new Error('schema.params is required for rule type:' + ruleTypeId);
      }
      const schemaType = ruleType.schemas.params.type;
      if (schemaType === 'config-schema') {
        expect(ruleType.schemas.params.schema.getSchema().describe()).toMatchSnapshot();
      } else if (schemaType === 'zod') {
        expect(zodToJsonSchema(ruleType.schemas.params.schema)).toMatchSnapshot();
      } else {
        throw new Error(`Support for ${schemaType} missing`);
      }
    });
  }
});
