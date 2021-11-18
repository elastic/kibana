/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import React from 'react';
import { alertWorkflowStatusRt } from '../../common/typings';
import { ExploratoryViewPage } from '../components/shared/exploratory_view';
import { AlertsPage } from '../pages/alerts';
import { AllCasesPage } from '../pages/cases/all_cases';
import { CaseDetailsPage } from '../pages/cases/case_details';
import { ConfigureCasesPage } from '../pages/cases/configure_cases';
import { CreateCasePage } from '../pages/cases/create_case';
import { HomePage } from '../pages/home';
import { LandingPage } from '../pages/landing';
import { OverviewPage } from '../pages/overview';
import { jsonRt } from './json_rt';

export type RouteParams<T extends keyof typeof routes> = DecodeParams<typeof routes[T]['params']>;

type DecodeParams<TParams extends Params | undefined> = {
  [key in keyof TParams]: TParams[key] extends t.Any ? t.TypeOf<TParams[key]> : never;
};

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
  },
  '/landing': {
    handler: () => {
      return <LandingPage />;
    },
    params: {},
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
  },
  '/cases': {
    handler: () => {
      return <AllCasesPage />;
    },
    params: {},
  },
  '/cases/create': {
    handler: () => {
      return <CreateCasePage />;
    },
    params: {},
  },
  '/cases/configure': {
    handler: () => {
      return <ConfigureCasesPage />;
    },
    params: {},
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
        workflowStatus: alertWorkflowStatusRt,
        refreshPaused: jsonRt.pipe(t.boolean),
        refreshInterval: jsonRt.pipe(t.number),
      }),
    },
  },
  '/exploratory-view/': {
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
  },
};
