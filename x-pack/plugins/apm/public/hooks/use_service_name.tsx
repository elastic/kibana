/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { ServiceNameContext } from '../context/service_name_context';

/**
 * Get the current service name, or undefined if there is no current service.
 *
 * Attempts to use the path parameters and then the ServiceNameContext provider.
 *
 * There are some situations (like the action menu -> alert triggers) where we
 * don't have the full route context but we can supply the service name through
 * a separate context.
 */
export function useServiceName() {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const serviceNameFromContext = useContext(ServiceNameContext);

  if (serviceName) {
    return serviceName;
  } else {
    return serviceNameFromContext;
  }
}
