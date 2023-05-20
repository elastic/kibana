/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { DatePickerContextProvider } from '../context/date_picker_context/date_picker_context';
import { useKibana } from '../utils/kibana_react';
import { AlertsPage } from '../pages/alerts/alerts';
import { AlertDetails } from '../pages/alert_details/alert_details';
import { CasesPage } from '../pages/cases/cases';
import { OverviewPage } from '../pages/overview/overview';
import { RulesPage } from '../pages/rules/rules';
import { RuleDetailsPage } from '../pages/rule_details';
import { SlosPage } from '../pages/slos/slos';
import { SlosWelcomePage } from '../pages/slos_welcome/slos_welcome';
import { SloDetailsPage } from '../pages/slo_details/slo_details';
import { SloEditPage } from '../pages/slo_edit/slo_edit';

export const OBSERVABILITY_BASE_PATH = '/app/observability';

export const ROOT_PATH = '/';
export const LANDING_PATH = '/landing';
export const OVERVIEW_PATH = '/overview';
export const ALERTS_PATH = '/alerts';
export const ALERT_DETAIL_PATH = '/alerts/:alertId';
export const EXPLORATORY_VIEW_PATH = '/exploratory-view'; // has been moved to its own app. Keeping around for redirecting purposes.
export const RULES_PATH = '/alerts/rules';
export const RULE_DETAIL_PATH = '/alerts/rules/:ruleId';
export const SLOS_PATH = '/slos';
export const SLOS_WELCOME_PATH = '/slos/welcome';
export const SLO_DETAIL_PATH = '/slos/:sloId';
export const SLO_CREATE_PATH = '/slos/create';
export const SLO_EDIT = '/slos/edit/:sloId';
export const CASES_PATH = '/cases';

export const paths = {
  observability: {
    alerts: `${OBSERVABILITY_BASE_PATH}${ALERTS_PATH}`,
    alertDetails: (alertId: string) =>
      `${OBSERVABILITY_BASE_PATH}${ALERTS_PATH}/${encodeURI(alertId)}`,
    rules: `${OBSERVABILITY_BASE_PATH}${RULES_PATH}`,
    ruleDetails: (ruleId: string) => `${OBSERVABILITY_BASE_PATH}${RULES_PATH}/${encodeURI(ruleId)}`,
    slos: `${OBSERVABILITY_BASE_PATH}${SLOS_PATH}`,
    slosWelcome: `${OBSERVABILITY_BASE_PATH}${SLOS_WELCOME_PATH}`,
    sloCreate: `${OBSERVABILITY_BASE_PATH}${SLO_CREATE_PATH}`,
    sloEdit: (sloId: string) => `${OBSERVABILITY_BASE_PATH}${SLOS_PATH}/edit/${encodeURI(sloId)}`,
    sloDetails: (sloId: string) => `${OBSERVABILITY_BASE_PATH}${SLOS_PATH}/${encodeURI(sloId)}`,
  },
  management: {
    rules: '/app/management/insightsAndAlerting/triggersActions/rules',
    ruleDetails: (ruleId: string) =>
      `/app/management/insightsAndAlerting/triggersActions/rule/${encodeURI(ruleId)}`,
    alertDetails: (alertId: string) =>
      `/app/management/insightsAndAlerting/triggersActions/alert/${encodeURI(alertId)}`,
  },
};

// Note: React Router DOM <Redirect> component was not working here
// so I've recreated this simple version for this purpose.
function SimpleRedirect({ to, redirectToApp }: { to: string; redirectToApp?: string }) {
  const {
    application: { navigateToApp },
  } = useKibana().services;
  const history = useHistory();
  const { search, hash } = useLocation();

  if (redirectToApp) {
    navigateToApp(redirectToApp, { path: `/${search}${hash}`, replace: true });
  } else if (to) {
    history.replace(to);
  }
  return null;
}

export const routes = {
  [ROOT_PATH]: {
    handler: () => {
      return <SimpleRedirect to={OVERVIEW_PATH} />;
    },
    params: {},
    exact: true,
  },
  [LANDING_PATH]: {
    handler: () => {
      return <SimpleRedirect to={OVERVIEW_PATH} />;
    },
    params: {},
    exact: true,
  },
  [OVERVIEW_PATH]: {
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
  [CASES_PATH]: {
    handler: () => {
      return <CasesPage />;
    },
    params: {},
    exact: false,
  },
  [ALERTS_PATH]: {
    handler: () => {
      return <AlertsPage />;
    },
    params: {
      // Technically gets a '_a' param by using Kibana URL state sync helpers
    },
    exact: true,
  },
  [EXPLORATORY_VIEW_PATH]: {
    handler: () => {
      return <SimpleRedirect to="/" redirectToApp={EXPLORATORY_VIEW_PATH.replace('/', '')} />;
    },
    params: {},
    exact: true,
  },
  [RULES_PATH]: {
    handler: () => {
      return <RulesPage />;
    },
    params: {},
    exact: true,
  },
  [RULE_DETAIL_PATH]: {
    handler: () => {
      return <RuleDetailsPage />;
    },
    params: {},
    exact: true,
  },
  [ALERT_DETAIL_PATH]: {
    handler: () => {
      return <AlertDetails />;
    },
    params: {},
    exact: true,
  },
  [SLOS_PATH]: {
    handler: () => {
      return <SlosPage />;
    },
    params: {},
    exact: true,
  },
  [SLO_CREATE_PATH]: {
    handler: () => {
      return <SloEditPage />;
    },
    params: {},
    exact: true,
  },
  [SLOS_WELCOME_PATH]: {
    handler: () => {
      return <SlosWelcomePage />;
    },
    params: {},
    exact: true,
  },
  [SLO_EDIT]: {
    handler: () => {
      return <SloEditPage />;
    },
    params: {},
    exact: true,
  },
  [SLO_DETAIL_PATH]: {
    handler: () => {
      return <SloDetailsPage />;
    },
    params: {},
    exact: true,
  },
};
