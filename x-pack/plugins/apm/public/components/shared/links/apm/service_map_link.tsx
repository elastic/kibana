/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { APMLinkExtendProps, useAPMHref } from './apm_link';

export function useServiceMapHref(serviceName?: string) {
  const path = serviceName
    ? `/services/${serviceName}/service-map`
    : '/service-map';
  return useAPMHref({ path });
}

interface ServiceMapLinkProps extends APMLinkExtendProps {
  serviceName?: string;
}

export function ServiceMapLink({ serviceName, ...rest }: ServiceMapLinkProps) {
  const href = useServiceMapHref(serviceName);
  return <EuiLink href={href} {...rest} />;
}
