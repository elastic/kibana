/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateSignificantEventDefinitions } from '@kbn/streams-plugin/server/routes/streams/significant_events/generate_signifcant_events';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { runRecipe } from '../utils/run_recipe';

runRecipe(async ({ inferenceClient, kibanaClient, log, logger }) => {
  const queries = await generateSignificantEventDefinitions({
    inferenceClient,
    esClient: createTracedEsClient({ client: kibanaClient.es, logger }),
    name: `logs`,
    logger,
  });

  log.info(queries);
});
