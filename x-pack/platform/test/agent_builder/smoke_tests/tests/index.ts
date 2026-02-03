/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getAvailableConnectors } from '@kbn/gen-ai-functional-testing';
import type { FtrProviderContext } from '../ftr_provider_context';
import { runConverseTests } from './converse';
import { createEisConnectors, cleanupEisConnectors, enableCcm } from './eis_helpers';

/**
 * Path to pre-discovered EIS models JSON file.
 * This file is created by running: node scripts/discover_eis_models.js
 * Stored in repo root target/ directory (standard CI artifact location)
 */
const EIS_MODELS_PATH = resolve(REPO_ROOT, 'target/eis_models.json');

/**
 * Environment variable for EIS CCM API key (set by CI from Vault)
 */
const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';

interface DiscoveredModel {
  inferenceId: string;
  modelId: string;
}

/**
 * Reads pre-discovered EIS models from JSON file.
 * Returns empty array if file doesn't exist (models not discovered yet).
 */
const getPreDiscoveredEisModels = (): DiscoveredModel[] => {
  if (!existsSync(EIS_MODELS_PATH)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(EIS_MODELS_PATH, 'utf8'));
    return data.models || [];
  } catch {
    return [];
  }
};

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const log = getService('log');
  const supertest = getService('supertest');
  const es = getService('es');

  // Read EIS models SYNCHRONOUSLY at file load time - no async needed!
  // This allows proper describe/it block creation without dynamic addTest() hacks.
  const eisModels = getPreDiscoveredEisModels();

  describe('Agent Builder - LLM Smoke tests', function () {
    // =========================================================================
    // PRECONFIGURED CONNECTOR SMOKE TESTS
    // Tests connectors configured via Vault (KIBANA_TESTING_AI_CONNECTORS)
    // =========================================================================
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
    // EIS SMOKE TESTS
    // Tests all EIS models discovered by the pre-discovery script.
    // Models are read from target/eis_models.json (created by discover_eis_models.js)
    // =========================================================================
    describe('EIS Smoke Tests', function () {
      this.timeout(600000); // 10 min for all EIS model tests

      if (eisModels.length === 0) {
        it('should skip - no EIS models discovered', function () {
          log.warning('[EIS] No models in target/eis_models.json');
          log.warning(
            '[EIS] Run: node x-pack/platform/test/agent_builder/scripts/discover_eis_models.js'
          );
          this.skip();
        });
      } else {
        // Store connector mappings: modelId -> connectorId
        const connectorMap = new Map<string, string>();
        const createdConnectorIds: string[] = [];

        before(async function () {
          // Enable CCM on FTR's ES instance (discovery used a separate ES)
          const apiKey = process.env[EIS_CCM_API_KEY_ENV];
          if (!apiKey) {
            throw new Error(
              `${EIS_CCM_API_KEY_ENV} not set. ` +
                `For local dev: export ${EIS_CCM_API_KEY_ENV}="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"`
            );
          }
          await enableCcm(es, apiKey, log);

          // Create connectors for pre-discovered models
          log.info(`[EIS] Creating connectors for ${eisModels.length} pre-discovered models...`);
          const { connectors, connectorIds } = await createEisConnectors(eisModels, supertest, log);

          // Populate connector map for tests to use
          for (const connector of connectors) {
            connectorMap.set(connector.modelId, connector.connectorId);
          }
          createdConnectorIds.push(...connectorIds);

          log.info(`[EIS] ✅ Created ${connectors.length} connectors`);
        });

        after(async function () {
          await cleanupEisConnectors(createdConnectorIds, supertest, log);
        });

        // Create proper describe/it blocks for each model - no dynamic addTest() needed!
        for (const model of eisModels) {
          describe(`Model: ${model.modelId}`, function () {
            it('should respond to simple message', async () => {
              const connectorId = connectorMap.get(model.modelId);
              if (!connectorId) {
                throw new Error(`Connector not created for model ${model.modelId}`);
              }
              await runConverseTests(connectorId, supertest, 'simple');
            });

            it('should execute tools', async () => {
              const connectorId = connectorMap.get(model.modelId);
              if (!connectorId) {
                throw new Error(`Connector not created for model ${model.modelId}`);
              }
              await runConverseTests(connectorId, supertest, 'tool');
            });

            it('should continue conversation', async () => {
              const connectorId = connectorMap.get(model.modelId);
              if (!connectorId) {
                throw new Error(`Connector not created for model ${model.modelId}`);
              }
              await runConverseTests(connectorId, supertest, 'conversation');
            });
          });
        }
      }
    });
  });
}
