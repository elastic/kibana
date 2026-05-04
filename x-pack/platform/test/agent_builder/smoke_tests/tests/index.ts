/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAvailableConnectors, takeRandomLlmSample } from '@kbn/gen-ai-functional-testing';
import type { FtrProviderContext } from '../ftr_provider_context';
import { converseApiSuite } from './converse';
import { getPreDiscoveredEisModels, enableCcm } from './eis_helpers';

// Environment variable for EIS CCM API key (set by CI from Vault)
const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';
const eisCcmApiKey = process.env[EIS_CCM_API_KEY_ENV];

// Connector IDs present in the Vault blob but no longer reachable upstream.
// Remove entries here once they're dropped from Vault.
const EXCLUDED_STATIC_CONNECTOR_IDS = new Set<string>(['bedrock-claude-sonnet-3-7']);

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const log = getService('log');
  const es = getService('es');

  const allStaticConnectors = getAvailableConnectors().filter(
    (c) => !EXCLUDED_STATIC_CONNECTOR_IDS.has(c.id)
  );
  const sampledStaticConnectors = takeRandomLlmSample(allStaticConnectors);
  const allEisModels = getPreDiscoveredEisModels();
  const sampledEisModels = takeRandomLlmSample(allEisModels);

  describe('Agent Builder - LLM Smoke tests', function () {
    before(function () {
      log.info(
        `[FTR] LLM smoke — static connectors (${sampledStaticConnectors.length}/${
          allStaticConnectors.length
        }): ${sampledStaticConnectors.map((c) => c.id).join(', ')}`
      );
      log.info(
        `[FTR] LLM smoke — EIS models (${sampledEisModels.length}/${
          allEisModels.length
        }): ${sampledEisModels.map((m) => m.modelId).join(', ')}`
      );
    });

    describe('Static Preconfigured Connectors (from Vault)', function () {
      this.timeout(300000);

      for (const connector of sampledStaticConnectors) {
        converseApiSuite(connector.id, connector.id, providerContext);
      }
    });

    describe('EIS Models (dynamically configured)', function () {
      this.timeout(300000);

      if (allEisModels.length === 0) {
        it('should skip - no EIS models discovered', function () {
          log.warning('[EIS] No models in target/eis_models.json');
          log.warning('[EIS] Run: node scripts/discover_eis_models.js');
          this.skip();
        });
      } else {
        before(async function () {
          if (!eisCcmApiKey) {
            throw new Error(
              `${EIS_CCM_API_KEY_ENV} not set. ` +
                `For local dev: export ${EIS_CCM_API_KEY_ENV}="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"`
            );
          }
          await enableCcm(es, eisCcmApiKey, log); // Enable CCM to provision EIS endpoints
        });

        for (const model of sampledEisModels) {
          const connectorId = `eis-${model.modelId}`;
          converseApiSuite(model.modelId, connectorId, providerContext);
        }
      }
    });
  });
}
