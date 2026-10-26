/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/synthtrace-client';
import {
  PRODUCTION_ENVIRONMENT,
  SERVICE_INFRA_ALL_DATA,
  SERVICE_INFRA_HOST_ONLY,
  SERVICE_INFRA_NO_DATA,
} from '../constants';

export function infrastructure({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);
  const serviceWithAllInfrastructure = apm
    .service({
      name: SERVICE_INFRA_ALL_DATA,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'go',
    })
    .instance('instance-a');
  const serviceWithHostInfrastructure = apm
    .service({
      name: SERVICE_INFRA_HOST_ONLY,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'java',
    })
    .instance('instance-b');
  const serviceWithoutInfrastructure = apm
    .service({
      name: SERVICE_INFRA_NO_DATA,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'nodejs',
    })
    .instance('instance-c');

  return range.interval('1m').generator((timestamp) => {
    return [
      serviceWithAllInfrastructure
        .transaction({ transactionName: 'GET /infrastructure/all' })
        .defaults({
          'container.id': 'apm-infra-container',
          'host.name': 'apm-infra-host',
          'kubernetes.pod.name': 'apm-infra-pod',
        })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      serviceWithHostInfrastructure
        .transaction({ transactionName: 'GET /infrastructure/host' })
        .defaults({
          'host.name': 'apm-infra-host-only',
        })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      serviceWithoutInfrastructure
        .transaction({ transactionName: 'GET /infrastructure/none' })
        .overrides({
          'host.name': undefined,
        })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
    ];
  });
}
