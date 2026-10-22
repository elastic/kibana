/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { EXPECTED_STARTUP_TRAINED_MODEL_IDS } from './constants';

const GUIDANCE =
  'Serverless must not start ML nodes or deploy trained models on startup. ' +
  'See https://github.com/elastic/kibana-team/issues/4111. Do not update the expected model list to fix this.';

// Background work (tasks, unawaited start hooks, timers) can run after Kibana reports available,
// so keep watching for a while instead of checking once.
const WATCH_DURATION_MS = 30_000;
const POLL_INTERVAL_MS = 5_000;

const getUnexpectedState = async (es: Client) => {
  const { trained_model_configs: models } = await es.ml.getTrainedModels({ size: 1000 });
  const { trained_model_stats: stats } = await es.ml.getTrainedModelsStats({ size: 1000 });

  const unexpectedModelIds = models
    .map(({ model_id: modelId }) => modelId)
    .filter((modelId) => !EXPECTED_STARTUP_TRAINED_MODEL_IDS.includes(modelId));
  const missingModelIds = EXPECTED_STARTUP_TRAINED_MODEL_IDS.filter(
    (expectedId) => !models.some(({ model_id: modelId }) => modelId === expectedId)
  );
  const deployedModelIds = stats
    .filter(({ deployment_stats: deploymentStats }) => deploymentStats !== undefined)
    .map(({ model_id: modelId }) => modelId);

  return { unexpectedModelIds, missingModelIds, deployedModelIds };
};

/**
 * Registers the "no ML models or deployments on startup" checks. Load it last in a serverless API
 * config so that other suites have had a chance to trigger background work first.
 */
export const defineNoMlNodesOnStartupTests = (es: Client) => {
  describe('No ML nodes or models on startup', function () {
    this.timeout(WATCH_DURATION_MS + 60_000);

    it('has only the expected trained models and no deployments', async () => {
      const expected = { unexpectedModelIds: [], missingModelIds: [], deployedModelIds: [] };
      const deadline = Date.now() + WATCH_DURATION_MS;

      do {
        const state = await getUnexpectedState(es);
        expect(state).to.eql(expected, `${GUIDANCE}\n${JSON.stringify(state, null, 2)}`);
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      } while (Date.now() < deadline);
    });
  });
};
