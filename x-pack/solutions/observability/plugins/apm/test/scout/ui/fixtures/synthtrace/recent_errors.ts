/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import { PRODUCTION_ENVIRONMENT } from '../constants';

export function serviceDataWithRecentErrors(): SynthtraceGenerator<ApmFields> {
  const start = Date.now() - 1000 * 60 * 15;
  const end = Date.now();
  const range = timerange(new Date(start).getTime(), new Date(end).getTime());

  const synthJava = apm
    .service({
      name: 'unstable-java',
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'java',
    })
    .instance('my-instance');

  return range.interval('1m').generator((timestamp, index) => {
    return [
      synthJava
        .transaction({ transactionName: 'GET /apple 🍎' })
        .timestamp(timestamp)
        .duration(1000)
        .failure()
        .errors(
          synthJava
            .error({ message: `Error ${index}`, type: `rotten apple ${index}` })
            .timestamp(timestamp)
        ),
    ];
  });
}
