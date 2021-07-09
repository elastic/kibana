/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRouteMatch } from 'react-router-dom';

export function useServiceName(): string | undefined {
  const match = useRouteMatch<{ serviceName?: string }>(
    '/services/:serviceName'
  );

  return match ? match.params.serviceName : undefined;
}
