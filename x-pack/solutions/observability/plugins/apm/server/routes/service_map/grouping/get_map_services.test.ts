/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_NAME, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
import type { ServiceMapSpan, ServicesResponse } from '../../../../common/service_map/types';
import { getMapServices } from './get_map_services';

function servicesData(names: readonly string[]): ServicesResponse[] {
  return names.map((name) => ({
    [SERVICE_NAME]: name,
    [AGENT_NAME]: 'java',
    [SERVICE_ENVIRONMENT]: null,
  }));
}

function span(serviceName: string, destinationServiceName?: string): ServiceMapSpan {
  return {
    serviceName,
    agentName: 'java',
    spanId: `${serviceName}-${destinationServiceName}`,
    spanType: 'external',
    spanSubtype: 'http',
    spanDestinationServiceResource: `${destinationServiceName ?? 'postgres'}:8080`,
    ...(destinationServiceName
      ? { destinationService: { serviceName: destinationServiceName, agentName: 'java' } }
      : {}),
  };
}

describe('getMapServices', () => {
  it('lists the services from the services query and the sample of traces once each, sorted', () => {
    expect(
      getMapServices({
        servicesData: servicesData(['cart', 'Checkout', 'ledger']),
        spans: [span('from-sample', 'constructor'), span('cart', 'ledger'), span('db-caller')],
      })
    ).toEqual(['Checkout', 'cart', 'constructor', 'db-caller', 'from-sample', 'ledger']);
  });
});
