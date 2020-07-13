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

interface RumOverviewLinkProps extends APMLinkExtendProps {
  serviceName?: string;
}
export function RumOverviewLink({
  serviceName,
  ...rest
}: RumOverviewLinkProps) {
  const path = serviceName
    ? `/services/${serviceName}/rum-overview`
    : '/rum-overview';

  return <APMLink path={path} {...rest} />;
}
