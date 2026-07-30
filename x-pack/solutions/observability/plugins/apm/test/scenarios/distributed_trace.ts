/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates a simple three-level distributed trace (rum -> nodejs -> go).
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm, httpExitSpan } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';

import type { RunOptions } from '@kbn/synthtrace';
import { getSynthtraceEnvironment } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const transactionName = '240rpm/75% 1000ms';
      const successfulTimestamps = range.interval('1s').rate(3);

      const synthRum = apm
        .service({ name: 'synth-rum', environment: ENVIRONMENT, agentName: 'rum-js' })
        .instance('my-instance');
      const synthNode = apm
        .service({ name: 'synth-node', environment: ENVIRONMENT, agentName: 'nodejs' })
        .instance('my-instance');
      const synthGo = apm
        .service({ name: 'synth-go', environment: ENVIRONMENT, agentName: 'go' })
        .instance('my-instance');

      const traces = successfulTimestamps.generator((timestamp) => {
        // synth-rum
        return synthRum
          .transaction({ transactionName })
          .duration(400)
          .timestamp(timestamp)
          .children(
            // synth-rum -> synth-node
            synthRum
              .span(
                httpExitSpan({
                  spanName: 'GET /api/products/top',
                  destinationUrl: 'http://synth-node:3000',
                })
              )
              .duration(300)
              .timestamp(timestamp)

              .children(
                // synth-node
                synthNode
                  .transaction({ transactionName: 'Initial transaction in synth-node' })
                  .duration(300)
                  .timestamp(timestamp)
                  .children(
                    synthNode
                      // synth-node -> synth-go
                      .span(
                        httpExitSpan({
                          spanName: 'GET synth-go:3000',
                          destinationUrl: 'http://synth-go:3000',
                        })
                      )
                      .timestamp(timestamp)
                      .duration(400)

                      .children(
                        // synth-go
                        synthGo

                          .transaction({ transactionName: 'Initial transaction in synth-go' })
                          .timestamp(timestamp)
                          .duration(200)
                          .children(
                            synthGo
                              .span({ spanName: 'custom_operation', spanType: 'custom' })
                              .timestamp(timestamp)
                              .duration(100)
                              .success()
                          )
                      )
                  )
              )
          );
      });

      return withClient(apmEsClient, traces);
    },
  };
};

export default scenario;
