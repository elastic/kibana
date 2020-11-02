/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { APMLink, APMLinkExtendProps } from './APMLink';

interface ServiceOverviewLinkProps extends APMLinkExtendProps {
  serviceName: string;
}

export function ServiceOverviewLink({
  serviceName,
  ...rest
}: ServiceOverviewLinkProps) {
  return <APMLink path={`/services/${serviceName}/overview`} {...rest} />;
}
