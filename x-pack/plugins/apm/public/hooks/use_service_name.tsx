/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory, matchPath } from 'react-router-dom';
import { apmRouteConfig } from '../components/routing/apm_route_config';

export function useServiceName(): string | undefined {
  const history = useHistory();
  for (const config of apmRouteConfig) {
    const match = matchPath<{ serviceName?: string }>(
      history.location.pathname,
      config
    );

    if (match) {
      return match.params.serviceName;
    }
  }
}
