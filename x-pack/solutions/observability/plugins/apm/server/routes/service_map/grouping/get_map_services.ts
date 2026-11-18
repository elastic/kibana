/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import type { ServiceMapSpan, ServicesResponse } from '../../../../common/service_map/types';
import { compareNames } from './utils';

/**
 * The services the map draws, sorted: those the services query found plus those its sample of
 * traces called or was called from. Every grouping strategy's assignment indexes this list, and
 * the grouping labels are read for exactly these services.
 */
export function getMapServices({
  spans,
  servicesData,
}: {
  spans: readonly ServiceMapSpan[];
  servicesData: readonly ServicesResponse[];
}): string[] {
  const services = new Set(servicesData.map((service) => service[SERVICE_NAME]));
  for (const { serviceName, destinationService } of spans) {
    services.add(serviceName);
    if (destinationService) {
      services.add(destinationService.serviceName);
    }
  }
  return [...services].sort(compareNames);
}
