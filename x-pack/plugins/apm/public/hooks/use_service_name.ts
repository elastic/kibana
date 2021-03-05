/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRouteMatch } from 'react-router-dom';

/**
 * Get the service name from the current URL path.
 *
 * Uses [`useRouteMatch`](https://reactrouter.com/web/api/Hooks/useroutematch)
 * so it can work outside of a context where the component has the defined route
 * as a parent, such as the header menu bar.
 */
export function useServiceName() {
  const match = useRouteMatch<{ serviceName?: string }>(
    '/services/:serviceName'
  );
  return match?.params?.serviceName;
}
