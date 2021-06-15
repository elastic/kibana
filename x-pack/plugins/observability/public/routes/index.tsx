/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as t from 'io-ts';
import { i18n } from '@kbn/i18n';
import { HomePage } from '../pages/home';
import { LandingPage } from '../pages/landing';
import { OverviewPage } from '../pages/overview';
import { jsonRt } from './json_rt';
import { AlertsPage } from '../pages/alerts';
import { CreateCasePage } from '../pages/cases/create_case';
import { ExploratoryViewPage } from '../components/shared/exploratory_view';
import { CaseDetailsPage } from '../pages/cases/case_details';
import { ConfigureCasesPage } from '../pages/cases/configure_cases';
import { AllCasesPage } from '../pages/cases/all_cases';
import { casesBreadcrumbs } from '../hooks/use_breadcrumbs';
import { alertStatusRt } from '../../common/typings';

export type RouteParams<T extends keyof typeof routes> = DecodeParams<typeof routes[T]['params']>;

type DecodeParams<TParams extends Params | undefined> = {
  [key in keyof TParams]: TParams[key] extends t.Any ? t.TypeOf<TParams[key]> : never;
};

export type Breadcrumbs = Array<{ text: string }>;

export interface Params {
  query?: t.HasProps;
  path?: t.HasProps;
}

export const routes = {
  '/': {
    handler: () => {
      return <HomePage />;
    },
    params: {},
    breadcrumb: [
      {
        text: i18n.translate('xpack.observability.home.breadcrumb', {
          defaultMessage: 'Overview',
        }),
      },
    ],
  },
  '/landing': {
    handler: () => {
      return <LandingPage />;
    },
    params: {},
    breadcrumb: [
      {
        text: i18n.translate('xpack.observability.landing.breadcrumb', {
          defaultMessage: 'Getting started',
        }),
      },
    ],
  },
  '/overview': {
    handler: ({ query }: any) => {
      return <OverviewPage routeParams={{ query }} />;
    },
    params: {
      query: t.partial({
        rangeFrom: t.string,
        rangeTo: t.string,
        refreshPaused: jsonRt.pipe(t.boolean),
        refreshInterval: jsonRt.pipe(t.number),
      }),
    },
    breadcrumb: [
      {
        text: i18n.translate('xpack.observability.overview.breadcrumb', {
          defaultMessage: 'Overview',
        }),
      },
    ],
  },
  '/cases': {
    handler: () => {
      return <AllCasesPage />;
    },
    params: {},
    breadcrumb: [casesBreadcrumbs.cases],
  },
  '/cases/create': {
    handler: () => {
      return <CreateCasePage />;
    },
    params: {},
    breadcrumb: [casesBreadcrumbs.cases, casesBreadcrumbs.create],
  },
  '/cases/configure': {
    handler: () => {
      return <ConfigureCasesPage />;
    },
    params: {},
    breadcrumb: [casesBreadcrumbs.cases, casesBreadcrumbs.configure],
  },
  '/cases/:detailName': {
    handler: () => {
      return <CaseDetailsPage />;
    },
    params: {
      path: t.partial({
        detailName: t.string,
      }),
    },
    breadcrumb: [casesBreadcrumbs.cases],
  },
  '/alerts': {
    handler: (routeParams: any) => {
      return <AlertsPage routeParams={routeParams} />;
    },
    params: {
      query: t.partial({
        rangeFrom: t.string,
        rangeTo: t.string,
        kuery: t.string,
        status: alertStatusRt,
        refreshPaused: jsonRt.pipe(t.boolean),
        refreshInterval: jsonRt.pipe(t.number),
      }),
    },
    breadcrumb: [
      {
        text: i18n.translate('xpack.observability.alerts.breadcrumb', {
          defaultMessage: 'Alerts',
        }),
      },
    ],
  },
  '/exploratory-view': {
    handler: () => {
      return <ExploratoryViewPage />;
    },
    params: {
      query: t.partial({
        rangeFrom: t.string,
        rangeTo: t.string,
        refreshPaused: jsonRt.pipe(t.boolean),
        refreshInterval: jsonRt.pipe(t.number),
      }),
    },
    breadcrumb: [
      {
        text: i18n.translate('xpack.observability.overview.exploratoryView', {
          defaultMessage: 'Analyze data',
        }),
      },
    ],
  },
};
