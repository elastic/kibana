/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { APMLink, APMLinkExtendProps, useAPMHref } from './APMLink';

function pathFor(serviceName?: string) {
  return serviceName ? `/services/${serviceName}/service-map` : '/service-map';
}

export function useServiceMapHref(serviceName?: string) {
  return useAPMHref(pathFor(serviceName));
}

interface ServiceMapLinkProps extends APMLinkExtendProps {
  serviceName?: string;
}

export function ServiceMapLink({ serviceName, ...rest }: ServiceMapLinkProps) {
  const path = pathFor(serviceName);
  return <APMLink path={path} {...rest} />;
}
