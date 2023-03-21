/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import React from 'react';
import { either } from 'fp-ts/lib/Either';
import { useHistory } from 'react-router-dom';
import { DatePickerContextProvider } from '../context/date_picker_context';
import { AlertsPage } from './pages/alerts/alerts';
import { AlertDetails } from './pages/alert_details/alert_details';
import { CasesPage } from './pages/cases/cases';
import { OverviewPage } from './pages/overview/overview';
import { RulesPage } from './pages/rules/rules';
import { RuleDetailsPage } from './pages/rule_details';
import { SlosPage } from './pages/slos/slos';
import { SloDetailsPage } from './pages/slo_details/slo_details';
import { SloEditPage } from './pages/slo_edit/slo_edit';
import { ObservabilityExploratoryView } from '../components/shared/exploratory_view/obsv_exploratory_view';

export type RouteParams<T extends keyof typeof routes> = DecodeParams<typeof routes[T]['params']>;

type DecodeParams<TParams extends Params | undefined> = {
  [key in keyof TParams]: TParams[key] extends t.Any ? t.TypeOf<TParams[key]> : never;
};

export interface Params {
  query?: t.HasProps;
  path?: t.HasProps;
}

const jsonRt = new t.Type<any, string, unknown>(
  'JSON',
  t.any.is,
  (input, context) =>
    either.chain(t.string.validate(input, context), (str) => {
      try {
        return t.success(JSON.parse(str));
      } catch (e) {
        return t.failure(input, context);
      }
    }),
  (a) => JSON.stringify(a)
);

// Note: React Router DOM <Redirect> component was not working here
// so I've recreated this simple version for this purpose.
function SimpleRedirect({ to }: { to: string }) {
  const history = useHistory();
  history.replace(to);
  return null;
}

export const OBSERVABILITY_BASE_PATH = '/app/observability';
export const OVERVIEW_URL = '/overview';
export const ALERTS_URL = '/alerts';
export const ALERT_DETAIL_URL = '/alerts/:alertId';
export const CASES_URL = '/cases';
export const EXPLORATORY_VIEW_URL = '/exploratory-view/';
export const RULES_URL = `${ALERTS_URL}/rules`;
export const RULE_DETAIL_URL = `${RULES_URL}/:ruleId'`;
export const SLOS_URL = '/slos';
export const SLOS_DETAIL_URL = '/slos/:sloId';
export const SLOS_CREATE_URL = '/slos/create';
export const SLOS_EDIT_URL = '/slos/edit/:sloId';

export const paths = {
  observability: {
    overview: `${OBSERVABILITY_BASE_PATH}${OVERVIEW_URL}`,
    alerts: `${OBSERVABILITY_BASE_PATH}${ALERTS_URL}`,
    alertDetails: (alertId: string) => `${ALERTS_URL}/${encodeURI(alertId)}`,
    rules: `${OBSERVABILITY_BASE_PATH}${RULES_URL}`,
    ruleDetails: (ruleId?: string | null) =>
      ruleId ? `${OBSERVABILITY_BASE_PATH}${RULES_URL}/${encodeURI(ruleId)}` : RULES_URL,
    slos: `${OBSERVABILITY_BASE_PATH}${SLOS_URL}`,
    sloCreate: `${OBSERVABILITY_BASE_PATH}/${SLOS_URL}/create`,
    sloEdit: (sloId: string) => `${OBSERVABILITY_BASE_PATH}/${SLOS_URL}/edit/${encodeURI(sloId)}`,
    sloDetails: (sloId: string) => `${OBSERVABILITY_BASE_PATH}/${SLOS_URL}/${encodeURI(sloId)}`,
  },
  management: {
    rules: '/app/management/insightsAndAlerting/triggersActions/rules',
    ruleDetails: (ruleId: string) =>
      `/app/management/insightsAndAlerting/triggersActions/rule/${encodeURI(ruleId)}`,
    alertDetails: (alertId: string) =>
      `/app/management/insightsAndAlerting/triggersActions/alert/${encodeURI(alertId)}`,
  },
};

export const routes = {
  '/': {
    handler: () => {
      return <SimpleRedirect to="/overview" />;
    },
    params: {},
    exact: true,
  },
  [OVERVIEW_URL]: {
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
  [CASES_URL]: {
    handler: () => {
      return <CasesPage />;
    },
    params: {},
    exact: false,
  },
  [ALERTS_URL]: {
    handler: () => {
      return <AlertsPage />;
    },
    params: {
      // Technically gets a '_a' param by using Kibana URL state sync helpers
    },
    exact: true,
  },
  [EXPLORATORY_VIEW_URL]: {
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
  [RULES_URL]: {
    handler: () => {
      return <RulesPage />;
    },
    params: {},
    exact: true,
  },
  [RULE_DETAIL_URL]: {
    handler: () => {
      return <RuleDetailsPage />;
    },
    params: {},
    exact: true,
  },
  [ALERT_DETAIL_URL]: {
    handler: () => {
      return <AlertDetails />;
    },
    params: {},
    exact: true,
  },
  [SLOS_URL]: {
    handler: () => {
      return <SlosPage />;
    },
    params: {},
    exact: true,
  },
  [SLOS_CREATE_URL]: {
    handler: () => {
      return <SloEditPage />;
    },
    params: {},
    exact: true,
  },
  [SLOS_EDIT_URL]: {
    handler: () => {
      return <SloEditPage />;
    },
    params: {},
    exact: true,
  },
  [SLOS_DETAIL_URL]: {
    handler: () => {
      return <SloDetailsPage />;
    },
    params: {},
    exact: true,
  },
};
