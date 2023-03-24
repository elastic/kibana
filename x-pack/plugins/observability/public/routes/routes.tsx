/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { useHistory } from 'react-router-dom';
import { withSuspense } from '@kbn/shared-ux-utility';
import { DatePickerContextProvider } from '../context/date_picker_context';

const AlertsPageLazy = lazy(() => import('./pages/alerts/alerts'));
const AlertDetailsPageLazy = lazy(() => import('./pages/alert_details/alert_details'));
const CasesPageLazy = lazy(() => import('./pages/cases/cases'));
const OverviewPageLazy = lazy(() => import('./pages/overview/overview'));
const RulesPageLazy = lazy(() => import('./pages/rules/rules'));
const RuleDetailsPageLazy = lazy(() => import('./pages/rule_details'));
const SlosPageLazy = lazy(() => import('./pages/slos/slos'));
const SloDetailsPageLazy = lazy(() => import('./pages/slo_details/slo_details'));
const SloEditPageLazy = lazy(() => import('./pages/slo_edit/slo_edit'));
const ObservabilityExploratoryViewLazy = lazy(
  () => import('../components/shared/exploratory_view/obsv_exploratory_view')
);

const AlertsPage = withSuspense(AlertsPageLazy);
const AlertDetailsPage = withSuspense(AlertDetailsPageLazy);
const CasesPage = withSuspense(CasesPageLazy);
const OverviewPage = withSuspense(OverviewPageLazy);
const RulesPage = withSuspense(RulesPageLazy);
const RuleDetailsPage = withSuspense(RuleDetailsPageLazy);
const SlosPage = withSuspense(SlosPageLazy);
const SloDetailsPage = withSuspense(SloDetailsPageLazy);
const SloEditPage = withSuspense(SloEditPageLazy);
const ObservabilityExploratoryView = withSuspense(ObservabilityExploratoryViewLazy);

export const OBSERVABILITY_BASE_PATH = '/app/observability';

export const OVERVIEW_URL = '/overview' as const;
export const ALERTS_URL = '/alerts' as const;
export const ALERT_DETAIL_URL = `${ALERTS_URL}/:alertId` as const;
export const CASES_URL = '/cases' as const;
export const EXPLORATORY_VIEW_URL = '/exploratory-view/' as const;
export const RULES_URL = `${ALERTS_URL}/rules` as const;
export const RULE_DETAIL_URL = `${RULES_URL}/:ruleId` as const;
export const SLOS_URL = '/slos' as const;
export const SLOS_CREATE_URL = '/slos/create' as const;
export const SLOS_DETAIL_URL = '/slos/:sloId' as const;
export const SLOS_EDIT_URL = '/slos/edit/:sloId' as const;

// Note: React Router DOM <Redirect> component was not working here
// so I've recreated this simple version for this purpose.
function SimpleRedirect({ to }: { to: string }) {
  const history = useHistory();
  history.replace(to);
  return null;
}

export const paths = {
  observability: {
    overview: `${OBSERVABILITY_BASE_PATH}${OVERVIEW_URL}`,
    alerts: `${OBSERVABILITY_BASE_PATH}${ALERTS_URL}`,
    alertDetails: (alertId: string) =>
      `${OBSERVABILITY_BASE_PATH}${ALERTS_URL}/${encodeURI(alertId)}`,
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

export const routes: Record<string, any> = {
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
  [ALERTS_URL]: {
    handler: () => {
      return <AlertsPage />;
    },
    params: {
      // Technically gets a '_a' param by using Kibana URL state sync helpers
    },
    exact: true,
  },
  [CASES_URL]: {
    handler: () => {
      return <CasesPage />;
    },
    params: {},
    exact: false,
  },
  [EXPLORATORY_VIEW_URL]: {
    handler: () => {
      return <ObservabilityExploratoryView />;
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
  // detail URLs
  [ALERT_DETAIL_URL]: {
    handler: () => {
      return <AlertDetailsPage />;
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
  [SLOS_DETAIL_URL]: {
    handler: () => {
      return <SloDetailsPage />;
    },
    params: {},
    exact: true,
  },
};
