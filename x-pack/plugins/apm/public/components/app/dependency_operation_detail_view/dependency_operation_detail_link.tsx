/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { TypeOf } from '@kbn/typed-react-router-config';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { ApmRoutes } from '../../routing/apm_route_config';

type Query = TypeOf<ApmRoutes, '/dependencies/operation'>['query'];

export function DependencyOperationDetailLink(query: Query) {
  const router = useApmRouter();

  const { spanName } = query;

  const link = router.link('/dependencies/operation', {
    query,
  });

  return (
    <EuiLink data-test-subj="apmDependencyOperationDetailLink" href={link}>
      {spanName}
    </EuiLink>
  );
}
