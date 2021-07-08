/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Breadcrumb } from '../../app/breadcrumb';
import { ServiceInventory } from '../../app/service_inventory';
import { ServiceMap } from '../../app/service_map';
import { TraceOverview } from '../../app/trace_overview';
import { ApmMainTemplate } from '../templates/apm_main_template';

function page<TPath extends string>({
  path,
  element,
  title,
}: {
  path: TPath;
  element: React.ReactElement<any, any>;
  title: string;
}): { path: TPath; element: React.ReactElement<any, any> } {
  return {
    path,
    element: (
      <Breadcrumb title={title} href={path}>
        <ApmMainTemplate pageTitle={title}>{element}</ApmMainTemplate>
      </Breadcrumb>
    ),
  };
}

export const ServiceInventoryTitle = i18n.translate(
  'xpack.apm.views.serviceInventory.title',
  {
    defaultMessage: 'Services',
  }
);

export const home = {
  path: '/',
  element: <Outlet />,
  params: t.partial({
    query: t.partial({
      rangeFrom: t.string,
      rangeTo: t.string,
    }),
  }),
  children: [
    page({
      path: '/services',
      title: ServiceInventoryTitle,
      element: <ServiceInventory />,
    }),
    page({
      path: '/traces',
      title: i18n.translate('xpack.apm.views.traceOverview.title', {
        defaultMessage: 'Traces',
      }),
      element: <TraceOverview />,
    }),
    page({
      path: '/service-map',
      title: i18n.translate('xpack.apm.views.serviceMap.title', {
        defaultMessage: 'Service Map',
      }),
      element: <ServiceMap />,
    }),
    {
      path: '/',
      element: <Redirect to="/services" />,
    },
  ],
} as const;
