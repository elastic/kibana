/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { buildServiceMapSearchParams } from '../../../embeddable/service_map/get_service_map_url';

/**
 * Redirects legacy per-service Service Map tab URLs to the global map,
 * seeding `service.name` via `_a.controlSelections`.
 */
export function RedirectFocusedServiceMapToGlobal() {
  const {
    path: { serviceName },
    query,
  } = useAnyOfApmParams(
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );

  const searchParams = buildServiceMapSearchParams({
    rangeFrom: query.rangeFrom,
    rangeTo: query.rangeTo,
    environment: query.environment,
    serviceName,
    serviceGroupId: 'serviceGroup' in query ? query.serviceGroup : undefined,
    // Drop kuery — filtering moves to Controls on the global map.
  });

  if ('comparisonEnabled' in query && query.comparisonEnabled !== undefined) {
    searchParams.set('comparisonEnabled', String(query.comparisonEnabled));
  }
  if ('offset' in query && query.offset) {
    searchParams.set('offset', query.offset);
  }

  return (
    <Redirect
      to={{
        pathname: '/service-map',
        search: searchParams.toString(),
      }}
    />
  );
}
