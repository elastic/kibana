/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { DatePickerContextProvider } from '../context/date_picker_context';
import { jsonRt } from './json_rt';
import { AlertsPage } from '../pages/alerts/alerts';
import { AlertDetails } from '../pages/alert_details/alert_details';
import { CasesPage } from '../pages/cases/cases';
import { OverviewPage } from '../pages/overview/overview';
import { RulesPage } from '../pages/rules/rules';
import { RuleDetailsPage } from '../pages/rule_details';
import { SlosPage } from '../pages/slos/slos';
import { SloDetailsPage } from '../pages/slo_details/slo_details';
import { SloEditPage } from '../pages/slo_edit/slo_edit';
import { ObservabilityExploratoryView } from '../components/shared/exploratory_view/obsv_exploratory_view';
import { casesPath } from '../../common';

export type RouteParams<T extends keyof typeof routes> = DecodeParams<typeof routes[T]['params']>;

type DecodeParams<TParams extends Params | undefined> = {
  [key in keyof TParams]: TParams[key] extends t.Any ? t.TypeOf<TParams[key]> : never;
};

export interface Params {
  query?: t.HasProps;
  path?: t.HasProps;
}

// Note: React Router DOM <Redirect> component was not working here
// so I've recreated this simple version for this purpose.
function SimpleRedirect({ to }: { to: string }) {
  const history = useHistory();
  history.replace(to);
  return null;
}

export const routes = {
  '/': {
    handler: () => {
      return <SimpleRedirect to="/overview" />;
    },
    params: {},
    exact: true,
  },
  '/landing': {
    handler: () => {
      return <SimpleRedirect to="/overview" />;
    },
    params: {},
    exact: true,
  },
  '/overview': {
    handler: () => {
      return (
        <DatePickerContextProvider>
          <OverviewPage />
        </DatePickerContextProvider>
      );
    },
    params: {},
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
  '/alerts/:alertId': {
    handler: () => {
      return <AlertDetails />;
    },
    params: {},
    exact: true,
  },
  '/slos': {
    handler: () => {
      return <SlosPage />;
    },
    params: {},
    exact: true,
  },
  '/slos/create': {
    handler: () => {
      return <SloEditPage />;
    },
    params: {},
    exact: true,
  },
  '/slos/edit/:sloId': {
    handler: () => {
      return <SloEditPage />;
    },
    params: {},
    exact: true,
  },
  '/slos/:sloId': {
    handler: () => {
      return <SloDetailsPage />;
    },
    params: {},
    exact: true,
  },
};
