/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, Instance, timerange } from '@kbn/apm-synthtrace-client';

const MAX_DEPENDENCIES = 10000;
const MAX_DEPENDENCIES_PER_SERVICE = 500;
const MAX_SERVICES = 20;

export function generateManyDependencies({
  from,
  to,
}: {
  from: number;
  to: number;
}) {
  const instances = Array.from({ length: MAX_SERVICES }).map((_, index) =>
    apm
      .service({
        name: `synth-java-${index}`,
        environment: 'production',
        agentName: 'java',
      })
      .instance(`java-instance-${index}`)
  );

  const instanceDependencies = (instance: Instance, startIndex: number) => {
    return Array.from(
      timerange(new Date(from), new Date(to))
        .interval('1m')
        .rate(60)
        .generator((timestamp, index) => {
          const currentIndex = index % MAX_DEPENDENCIES_PER_SERVICE;
          const destination = (startIndex + currentIndex) % MAX_DEPENDENCIES;

          const span = instance
            .transaction({ transactionName: 'GET /java' })
            .timestamp(timestamp)
            .duration(400)
            .success()
            .children(
              instance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .destination(`elasticsearch/${destination}`)
                .timestamp(timestamp)
                .duration(200)
                .success()
            );

          return span;
        })
    );
  };

  return instances.flatMap((instance, index) =>
    instanceDependencies(
      instance,
      (index * MAX_DEPENDENCIES_PER_SERVICE) % MAX_DEPENDENCIES
    )
  );
}
