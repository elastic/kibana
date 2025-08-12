/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config';
import { EuiLink } from '@elastic/eui';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import type { ApmRoutes } from '../../../routing/apm_route_config';
import type { APMLinkExtendProps } from './apm_link_hooks';

interface ServiceMapLinkProps extends APMLinkExtendProps {
  serviceName?: string;
  query:
    | TypeOf<ApmRoutes, '/services/{serviceName}/service-map'>['query']
    | TypeOf<ApmRoutes, '/service-map'>['query'];
}

export function ServiceMapLink({ serviceName, query, ...rest }: ServiceMapLinkProps) {
  const { link } = useApmRouter();
  const href = serviceName
    ? link('/services/{serviceName}/service-map', {
        path: {
          serviceName,
        },
        query,
      })
    : link('/service-map', { query });
  return <EuiLink data-test-subj="apmServiceMapLinkLink" href={href} {...rest} />;
}
