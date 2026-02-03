/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error we don't use @types/mocha so it doesn't conflict with @types/jest
import Test from 'mocha/lib/test';
import { getAvailableConnectors } from '@kbn/gen-ai-functional-testing';
import type { FtrProviderContext } from '../ftr_provider_context';
import { runConverseTests } from './converse';
import {
  EIS_CCM_API_KEY_ENV,
  enableCcm,
  discoverEisModels,
  createEisConnectors,
  cleanupEisConnectors,
} from './eis_helpers';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const log = getService('log');
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Agent Builder - LLM Smoke tests', function () {
    // Preconfigured connectors from Vault (static - registered synchronously)
    describe('Preconfigured Connector Smoke Tests', function () {
      this.timeout(300000);

      const connectors = getAvailableConnectors();

      for (const connector of connectors) {
        describe(`Connector: ${connector.id}`, function () {
          it('should respond to simple message', async () => {
            await runConverseTests(connector.id, supertest, 'simple');
          });

          it('should execute tools', async () => {
            await runConverseTests(connector.id, supertest, 'tool');
          });

          it('should continue conversation', async () => {
            await runConverseTests(connector.id, supertest, 'conversation');
          });
        });
      }
    });

    // =========================================================================
    // EIS DYNAMIC SMOKE TESTS
    // Tests are added programmatically using Mocha's addTest() API.
    // This allows async discovery in before() hook while still getting
    // individual test entries in the test results.
    // =========================================================================
    describe('EIS Dynamic Smoke Tests', function () {
      this.timeout(600000); // 10 min for all EIS model tests

      before(async function () {
        const apiKey = process.env[EIS_CCM_API_KEY_ENV];

        // Store for cleanup
        (this as any).createdConnectorIds = [] as string[];

        if (!apiKey) {
          log.warning(
            `[EIS] ${EIS_CCM_API_KEY_ENV} not set - skipping EIS tests.\n` +
              `For local dev: export ${EIS_CCM_API_KEY_ENV}="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"`
          );
          return;
        }

        // Step 1: Enable CCM
        await enableCcm(es, apiKey, log);

        // Step 2: Discover EIS models
        const discovered = await discoverEisModels(es, log);
        if (discovered.length === 0) return;

        // Step 3: Create connectors
        const { connectors, connectorIds } = await createEisConnectors(discovered, supertest, log);
        (this as any).createdConnectorIds = connectorIds;

        // Step 4: Dynamically add tests for each model
        const suite = this.test!.parent!;
        for (const model of connectors) {
          suite.addTest(
            new Test(`${model.modelId} - should respond to simple message`, async () => {
              await runConverseTests(model.connectorId, supertest, 'simple');
            })
          );
          suite.addTest(
            new Test(`${model.modelId} - should execute tools`, async () => {
              await runConverseTests(model.connectorId, supertest, 'tool');
            })
          );
          suite.addTest(
            new Test(`${model.modelId} - should continue conversation`, async () => {
              await runConverseTests(model.connectorId, supertest, 'conversation');
            })
          );
        }

        log.info(`[EIS] Added ${connectors.length * 3} dynamic tests`);
      });

      after(async function () {
        const connectorIds = (this as any).createdConnectorIds as string[];
        await cleanupEisConnectors(connectorIds, supertest, log);
      });

      // Placeholder test - ensures the suite isn't empty during dry run
      it('should have EIS tests or skip', function () {
        if ((this.test!.parent!.tests?.length ?? 0) > 1) {
          this.skip();
        }
        log.warning('[EIS] No EIS models available - suite skipped');
      });
    });
  });
}
