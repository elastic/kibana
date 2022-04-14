/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import React from 'react';
import { casesPath } from '../../common';
import { CasesPage } from '../pages/cases';
import { AlertsPage } from '../pages/alerts/containers/alerts_page';
import { HomePage } from '../pages/home';
import { LandingPage } from '../pages/landing';
import { OverviewPage } from '../pages/overview';
import { jsonRt } from './json_rt';
import { ObservabilityExploratoryView } from '../components/shared/exploratory_view/obsv_exploratory_view';
import { RulesPage } from '../pages/rules';
import { RuleDetailsPage } from '../pages/rule_details';

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
    exact: true,
  },
  '/landing': {
    handler: () => {
      return <LandingPage />;
    },
    params: {},
    exact: true,
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
        alpha: jsonRt.pipe(t.boolean),
      }),
    },
    exact: true,
  },
  [casesPath]: {
    handler: () => {
      return <CasesPage />;
    },
    params: {},
    exact: false,
  },
  '/alerts': {
    handler: () => {
      return <AlertsPage />;
    },
    params: {
      // Technically gets a '_a' param by using Kibana URL state sync helpers
    },
    exact: true,
  },
  '/exploratory-view/': {
    handler: () => {
      return <ObservabilityExploratoryView />;
    },
    params: {
      query: t.partial({
        rangeFrom: t.string,
        rangeTo: t.string,
        refreshPaused: jsonRt.pipe(t.boolean),
        refreshInterval: jsonRt.pipe(t.number),
      }),
    },
    exact: true,
  },
  '/alerts/rules': {
    handler: () => {
      return <RulesPage />;
    },
    params: {},
    exact: true,
  },
  '/alerts/rules/:ruleId': {
    handler: () => {
      return <RuleDetailsPage />;
    },
    params: {},
    exact: true,
  },
};
