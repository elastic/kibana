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
import { LandingPage } from '../pages/landing/landing';
import { OverviewPage } from '../pages/overview/overview';
import { RulesPage } from '../pages/rules/rules';
import { RuleDetailsPage } from '../pages/rule_details/rule_details';
import {
  ALERTS_PATH,
  ALERT_DETAIL_PATH,
  CASES_PATH,
  EXPLORATORY_VIEW_PATH,
  LANDING_PATH,
  OVERVIEW_PATH,
  ROOT_PATH,
  RULES_LOGS_PATH,
  RULES_PATH,
  RULE_DETAIL_PATH,
  OLD_SLOS_PATH,
  OLD_SLOS_WELCOME_PATH,
  OLD_SLOS_OUTDATED_DEFINITIONS_PATH,
  OLD_SLO_DETAIL_PATH,
  OLD_SLO_EDIT_PATH,
} from '../../common/locators/paths';
import { HasDataContextProvider } from '../context/has_data_context/has_data_context';

// Note: React Router DOM <Redirect> component was not working here
// so I've recreated this simple version for this purpose.
function SimpleRedirect({ to, redirectToApp }: { to: string; redirectToApp?: string }) {
  const {
    application: { navigateToApp },
  } = useKibana().services;
  const history = useHistory();
  const { search, hash, pathname } = useLocation();
  if (redirectToApp) {
    if (to === '/:sloId') {
      to = pathname.split('/slos')[1];
    }
    navigateToApp(redirectToApp, {
      path: `/${to}${search ? `?${search}` : ''}${hash}`,
      replace: true,
    });
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
      return (
        <HasDataContextProvider>
          <LandingPage />
        </HasDataContextProvider>
      );
    },
    params: {},
    exact: true,
  },
  [OVERVIEW_PATH]: {
    handler: () => {
      return (
        <HasDataContextProvider>
          <DatePickerContextProvider>
            <OverviewPage />
          </DatePickerContextProvider>
        </HasDataContextProvider>
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
    params: {},
    exact: true,
  },
  [EXPLORATORY_VIEW_PATH]: {
    handler: () => {
      return <SimpleRedirect to="/" redirectToApp="exploratory-view" />;
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
  [RULES_LOGS_PATH]: {
    handler: () => {
      return <RulesPage activeTab="logs" />;
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
  [OLD_SLOS_PATH]: {
    handler: () => {
      return <SimpleRedirect to="/" redirectToApp="slo" />;
    },
    params: {},
    exact: true,
  },
  [OLD_SLOS_WELCOME_PATH]: {
    handler: () => {
      return <SimpleRedirect to="/welcome" redirectToApp="slo" />;
    },
    params: {},
    exact: true,
  },
  [OLD_SLOS_OUTDATED_DEFINITIONS_PATH]: {
    handler: () => {
      return <SimpleRedirect to="/outdated-definitions" redirectToApp="slo" />;
    },
    params: {},
    exact: true,
  },
  [OLD_SLO_DETAIL_PATH]: {
    handler: () => {
      return <SimpleRedirect to="/:sloId" redirectToApp="slo" />;
    },
    params: {},
    exact: true,
  },
  [OLD_SLO_EDIT_PATH]: {
    handler: () => {
      return <SimpleRedirect to="/:sloId" redirectToApp="slo" />;
    },
    params: {},
    exact: true,
  },
};
