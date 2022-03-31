/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { toBooleanRt } from '@kbn/io-ts-utils';
import { Breadcrumb } from '../app/breadcrumb';
import { TraceLink } from '../app/trace_link';
import { TransactionLink } from '../app/transaction_link';
import { home } from './home';
import { serviceDetail } from './service_detail';
import { settings } from './settings';
import { ApmMainTemplate } from './templates/apm_main_template';
import { ServiceGroupsList } from '../app/service_groups';
import { ServiceGroupsRedirect } from './service_groups_redirect';
import { offsetRt } from '../../../common/offset_rt';

const ServiceGroupsBreadcrumnbLabel = i18n.translate(
  'xpack.apm.views.serviceGroups.breadcrumbLabel',
  { defaultMessage: 'Services' }
);
const ServiceGroupsTitle = i18n.translate(
  'xpack.apm.views.serviceGroups.title',
  { defaultMessage: 'Service groups' }
);

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const apmRoutes = {
  '/link-to/transaction/{transactionId}': {
    element: <TransactionLink />,
    params: t.intersection([
      t.type({
        path: t.type({
          transactionId: t.string,
        }),
      }),
      t.partial({
        query: t.partial({
          rangeFrom: t.string,
          rangeTo: t.string,
        }),
      }),
    ]),
  },
  '/link-to/trace/{traceId}': {
    element: <TraceLink />,
    params: t.intersection([
      t.type({
        path: t.type({
          traceId: t.string,
        }),
      }),
      t.partial({
        query: t.partial({
          rangeFrom: t.string,
          rangeTo: t.string,
        }),
      }),
    ]),
  },
  '/': {
    element: (
      <Breadcrumb title="APM" href="/">
        <Outlet />
      </Breadcrumb>
    ),
    children: {
      // this route fails on navigation unless it's defined before home
      '/service-groups': {
        element: (
          <Breadcrumb
            title={ServiceGroupsBreadcrumnbLabel}
            href={'/service-groups'}
          >
            <ApmMainTemplate
              pageTitle={ServiceGroupsTitle}
              environmentFilter={false}
              showServiceGroupSaveButton
            >
              <ServiceGroupsRedirect>
                <ServiceGroupsList />
              </ServiceGroupsRedirect>
            </ApmMainTemplate>
          </Breadcrumb>
        ),
        params: t.type({
          query: t.intersection([
            t.type({
              rangeFrom: t.string,
              rangeTo: t.string,
              comparisonEnabled: toBooleanRt,
            }),
            t.partial({
              serviceGroup: t.string,
            }),
            t.partial({
              refreshPaused: t.union([t.literal('true'), t.literal('false')]),
              refreshInterval: t.string,
            }),
            offsetRt,
          ]),
        }),
      },
      ...settings,
      ...serviceDetail,
      ...home,
    },
  },
};

export type ApmRoutes = typeof apmRoutes;

export const apmRouter = createRouter(apmRoutes);

export type ApmRouter = typeof apmRouter;
