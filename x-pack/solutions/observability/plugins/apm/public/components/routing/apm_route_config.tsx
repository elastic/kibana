/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import { z } from '@kbn/zod/v4';
import React from 'react';
import { toBooleanFromString } from '../../../common/utils/to_boolean_from_string';
import { Breadcrumb } from '../app/breadcrumb';
import { TraceLink } from '../app/trace_link';
import { TransactionLink } from '../app/transaction_link';
import { homeRoute } from './home';
import { serviceDetailRoute } from './service_detail';
import { mobileServiceDetailRoute } from './mobile_service_detail';
import { settingsRoute } from './settings';
import { onboarding } from './onboarding';
import { tutorialRedirectRoute } from './onboarding/redirect';
import { ServiceGroupTemplate } from './templates/service_group_template';
import { ServiceGroupsList } from '../app/service_groups';
import { offsetSchema } from '../../../common/comparison_rt';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { environmentSchema } from '../../../common/environment_rt';
import { diagnosticsRoute } from '../app/diagnostics';
import { TransactionDetailsByNameLink } from '../app/transaction_details_link';

const ServiceGroupsTitle = i18n.translate('xpack.apm.views.serviceGroups.title', {
  defaultMessage: 'Service groups',
});
const ServiceInventoryTitle = i18n.translate('xpack.apm.views.serviceInventory.title', {
  defaultMessage: 'Service inventory',
});

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const apmRoutes = {
  '/link-to/transaction': {
    element: <TransactionDetailsByNameLink />,
    params: z.object({
      query: z.object({ transactionName: z.string(), serviceName: z.string() }).merge(
        z.object({
          rangeFrom: z.string().optional(),
          rangeTo: z.string().optional(),
          environment: z.string().optional(),
        })
      ),
    }),
  },
  '/link-to/transaction/{transactionId}': {
    element: <TransactionLink />,
    params: z
      .object({
        path: z.object({
          transactionId: z.string(),
        }),
      })
      .merge(
        z.object({
          query: z
            .object({
              rangeFrom: z.string().optional(),
              rangeTo: z.string().optional(),
              waterfallItemId: z.string().optional(),
            })
            .optional(),
        })
      ),
  },
  '/link-to/trace/{traceId}': {
    element: <TraceLink />,
    params: z
      .object({
        path: z.object({
          traceId: z.string(),
        }),
      })
      .merge(
        z.object({
          query: z
            .object({
              rangeFrom: z.string().optional(),
              rangeTo: z.string().optional(),
              waterfallItemId: z.string().optional(),
            })
            .optional(),
        })
      ),
  },
  '/': {
    element: (
      <Breadcrumb
        title={i18n.translate('xpack.apm..breadcrumb.apmLabel', {
          defaultMessage: 'APM',
        })}
        href="/"
        omitOnServerless
      >
        <Outlet />
      </Breadcrumb>
    ),
    children: {
      // this route fails on navigation unless it's defined before home
      '/service-groups': {
        element: (
          <Breadcrumb
            title={ServiceGroupsTitle}
            href={'/service-groups'}
            parentTitle={ServiceInventoryTitle}
            parentHref={'/services'}
            omitOnServerless
          >
            <ServiceGroupTemplate
              pageTitle={ServiceGroupsTitle}
              pagePath="/service-groups"
              serviceGroupContextTab="service-groups"
            >
              <ServiceGroupsList />
            </ServiceGroupTemplate>
          </Breadcrumb>
        ),
        params: z.object({
          query: environmentSchema
            .merge(
              z.object({
                rangeFrom: z.string(),
                rangeTo: z.string(),
                kuery: z.string(),
                comparisonEnabled: toBooleanFromString,
              })
            )
            .merge(
              z.object({
                serviceGroup: z.string(),
              })
            )
            .merge(
              z.object({
                refreshPaused: z.union([z.literal('true'), z.literal('false')]).optional(),
                refreshInterval: z.string().optional(),
              })
            )
            .merge(offsetSchema),
        }),
        defaults: {
          query: {
            environment: ENVIRONMENT_ALL.value,
            kuery: '',
            serviceGroup: '',
          },
        },
      },
      ...tutorialRedirectRoute,
      ...onboarding,
      ...diagnosticsRoute,
      ...settingsRoute,
      ...serviceDetailRoute,
      ...mobileServiceDetailRoute,
      ...homeRoute,
    },
  },
};

export type ApmRoutes = typeof apmRoutes;

export const apmRouter = createRouter(apmRoutes);

export type ApmRouter = typeof apmRouter;
