/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { APMLinkExtendProps, useAPMHref } from './apm_link';

interface ServiceProfilingLinkProps extends APMLinkExtendProps {
  serviceName: string;
  environment?: string;
}

export function useServiceProfilingHref({
  serviceName,
  environment,
}: ServiceProfilingLinkProps) {
  const query = environment
    ? {
        environment,
      }
    : {};
  return useAPMHref({
    path: `/services/${serviceName}/profiling`,
    query,
  });
}

export function ServiceProfilingLink({
  serviceName,
  environment,
  ...rest
}: ServiceProfilingLinkProps) {
  const href = useServiceProfilingHref({ serviceName, environment });
  return <EuiLink href={href} {...rest} />;
}
