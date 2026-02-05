/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAvailableConnectors } from '@kbn/gen-ai-functional-testing';
import type { FtrProviderContext } from '../ftr_provider_context';
import { converseApiSuite } from './converse';
import {
  getPreDiscoveredEisModels,
  createEisConnectors,
  cleanupEisConnectors,
  enableCcm,
} from './eis_helpers';

// Environment variable for EIS CCM API key (set by CI from Vault)
const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';
const eisCcmApiKey = process.env[EIS_CCM_API_KEY_ENV];

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const log = getService('log');
  const supertest = getService('supertest');
  const es = getService('es');

  const eisModels = getPreDiscoveredEisModels();

  describe('Agent Builder - LLM Smoke tests', function () {
    describe('Preconfigured Connectors', function () {
      this.timeout(300000);

      const connectors = getAvailableConnectors();

      for (const connector of connectors) {
        converseApiSuite(connector.id, connector.id, supertest);
      }
    });

    describe('EIS Models', function () {
      this.timeout(3000000); // 50 min for all EIS model tests - this won't scale well (the timeout for the CI pipeline is 50 minutes)

      if (eisModels.length === 0) {
        it('should skip - no EIS models discovered', function () {
          log.warning('[EIS] No models in target/eis_models.json');
          log.warning('[EIS] Run: node scripts/discover_eis_models.js');
          this.skip();
        });
      } else {
        const connectorMap = new Map<string, string>();

        before(async function () {
          if (!eisCcmApiKey) {
            throw new Error(
              `${EIS_CCM_API_KEY_ENV} not set. ` +
                `For local dev: export ${EIS_CCM_API_KEY_ENV}="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"`
            );
          }
          await enableCcm(es, eisCcmApiKey, log);

          // Create connectors for pre-discovered models
          const { connectors } = await createEisConnectors(eisModels, supertest, log);

          // Populate connector map for tests to use
          for (const connector of connectors) {
            connectorMap.set(connector.modelId, connector.connectorId);
          }
        });

        after(async function () {
          await cleanupEisConnectors([...connectorMap.values()], supertest, log);
        });

        // Create test suites for each model using getter function for dynamic connectorId lookup
        for (const model of eisModels) {
          const getConnectorId = () => {
            const connectorId = connectorMap.get(model.modelId);
            if (!connectorId) {
              throw new Error(`Connector not created for model ${model.modelId}`);
            }
            return connectorId;
          };
          converseApiSuite(model.modelId, getConnectorId, supertest);
        }
      }
    });
  });
}
