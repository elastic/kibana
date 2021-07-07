/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Outlet } from '@kbn/typed-react-router-config/target/outlet';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { Breadcrumb } from '../../app/breadcrumb';
import { ServiceInventoryTitle } from '../home';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';

export function ApmServiceWrapper() {
  const {
    path: { serviceName },
    query: { rangeFrom, rangeTo, environment },
  } = useApmParams('/services/:serviceName');

  const defaultQuery = {
    rangeFrom,
    rangeTo,
    environment,
  };

  const router = useApmRouter();

  useBreadcrumb([
    {
      title: ServiceInventoryTitle,
      href: router.link('/services', { query: defaultQuery }),
    },
    {
      title: serviceName,
      href: router.link('/services/:serviceName', {
        query: defaultQuery,
        path: { serviceName },
      }),
    },
  ]);

  return <Outlet />;
}
