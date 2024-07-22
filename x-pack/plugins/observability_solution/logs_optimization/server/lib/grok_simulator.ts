/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestGrokProcessor,
  IngestSimulateDocument,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

interface SimulationParams {
  docs: IngestSimulateDocument[];
  field: IngestGrokProcessor['field'];
  patterns: IngestGrokProcessor['patterns'];
}

export class GrokSimulator {
  constructor(private esClient: ElasticsearchClient) {}

  runSimulation({ docs, patterns, field = 'message' }: SimulationParams) {
    return this.esClient.ingest.simulate({
      verbose: true,
      pipeline: {
        description: 'GROK simulation',
        processors: [
          {
            grok: {
              field,
              patterns,
              ignore_failure: true,
            },
          },
        ],
      },
      docs,
    });
  }

  async canExtractPattern(params: SimulationParams) {
    const simulation = await this.runSimulation(params);

    // Assert if at least from a document we can extract the passed pattern
    return simulation.docs.some(
      (simulatedDoc) => simulatedDoc.processor_results?.at(0)?.status === 'success'
    );
  }
}
