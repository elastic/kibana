/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates a trace with an extremely high number of services (500) to test service map performance.
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { httpExitSpan } from '@kbn/synthtrace-client';
import { service } from '@kbn/synthtrace-client/src/lib/apm/service';
import type { Transaction } from '@kbn/synthtrace-client/src/lib/apm/transaction';
import type { Scenario } from '@kbn/synthtrace';
import { getSynthtraceEnvironment } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';

const environment = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async () => {
  const numServices = 500;

  const tracesPerMinute = 10;

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const services = new Array(numServices)
        .fill(undefined)
        .map((_, idx) => {
          return service(`service-${idx}`, 'prod', environment).instance('service-instance');
        })
        .reverse();

      return withClient(
        apmEsClient,
        range.ratePerMinute(tracesPerMinute).generator((timestamp) => {
          const rootTransaction = services.reduce((prev, currentService) => {
            const tx = currentService
              .transaction(`GET /my/function`, 'request')
              .timestamp(timestamp)
              .duration(1000)
              .children(
                ...(prev
                  ? [
                      currentService
                        .span(
                          httpExitSpan({
                            spanName: `exit-span-${currentService.fields['service.name']}`,
                            destinationUrl: `http://address-to-exit-span-${currentService.fields['service.name']}`,
                          })
                        )
                        .timestamp(timestamp)
                        .duration(1000)
                        .children(prev),
                    ]
                  : [])
              );

            return tx;
          }, undefined as Transaction | undefined);

          return rootTransaction!;
        })
      );
    },
  };
};

export default scenario;
