/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { TypeOf } from '@kbn/typed-react-router-config';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { ApmRoutes } from '../../../routing/apm_route_config';

interface Props {
  children: React.ReactNode;
  title?: string;
  serviceName: string;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/errors'>['query'];
}

export function ErrorOverviewLink({ serviceName, query, ...rest }: Props) {
  const router = useApmRouter();
  const errorOverviewLink = router.link('/services/{serviceName}/errors', {
    path: {
      serviceName,
    },
    query,
  });

  return <EuiLink href={errorOverviewLink} {...rest} />;
}
