/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { OVERVIEW_PATH } from '../common/features/alerts_and_slos/locators/paths';
import { ConversationView } from './features/ai_assistant/routes/conversations/conversation_view';
import { DatePickerContextProvider } from './features/alerts_and_slos/context/date_picker_context/date_picker_context';
import { HasDataContextProvider } from './features/alerts_and_slos/context/has_data_context/has_data_context';
import { AlertsPage } from './features/alerts_and_slos/pages/alerts/alerts';
import { AlertDetails } from './features/alerts_and_slos/pages/alert_details/alert_details';
import { CasesPage } from './features/alerts_and_slos/pages/cases/cases';
import { LandingPage } from './features/alerts_and_slos/pages/landing/landing';
import { OverviewPage } from './features/alerts_and_slos/pages/overview/overview';
import { RulesPage } from './features/alerts_and_slos/pages/rules/rules';
import { RuleDetailsPage } from './features/alerts_and_slos/pages/rule_details/rule_details';
import { SlosPage } from './features/alerts_and_slos/pages/slos/slos';
import { SlosWelcomePage } from './features/alerts_and_slos/pages/slos_welcome/slos_welcome';
import { SloDetailsPage } from './features/alerts_and_slos/pages/slo_details/slo_details';
import { SloEditPage } from './features/alerts_and_slos/pages/slo_edit/slo_edit';
import { SlosOutdatedDefinitions } from './features/alerts_and_slos/pages/slo_outdated_definitions';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const observabilityRoutes = {
  '/': {
    element: <Redirect to={OVERVIEW_PATH} />,
  },
  '/landing': {
    element: <LandingPage />,
  },
  '/overview': {
    element: (
      <HasDataContextProvider>
        <DatePickerContextProvider>
          <OverviewPage />
        </DatePickerContextProvider>
      </HasDataContextProvider>
    ),
  },
  '/cases': {
    element: <CasesPage />,

    exact: false,
  },
  '/alerts': {
    element: <Outlet />,

    children: {
      '/alerts': {
        element: <AlertsPage />,
      },
      '/alerts/rules': {
        element: <RulesPage />,
      },
      '/alerts/rules/logs': {
        element: <RulesPage activeTab="logs" />,
      },
      '/alerts/rules/{ruleId}': {
        element: <RuleDetailsPage />,
        params: t.type({
          path: t.type({
            ruleId: t.string,
          }),
        }),
      },
      '/alerts/{alertId}': {
        element: <AlertDetails />,
        params: t.type({
          path: t.type({
            alertId: t.string,
          }),
        }),
      },
    },
  },
  '/slos': {
    element: <Outlet />,
    children: {
      '/slos': {
        element: <SlosPage />,
      },
      '/slos/welcome': {
        element: <SlosWelcomePage />,
      },
      '/slos/outdated-definitions': {
        element: <SlosOutdatedDefinitions />,
      },
      '/slos/create': {
        element: <SloEditPage />,
      },
      '/slos/edit/{sloId}': {
        element: <SloEditPage />,
        params: t.type({
          path: t.type({
            sloId: t.string,
          }),
        }),
      },
      '/slos/{sloId}': {
        element: <SloDetailsPage />,
        params: t.type({
          path: t.type({
            sloId: t.string,
          }),
        }),
      },
    },
  },
  '/conversations': {
    element: <Outlet />,
    children: {
      '/conversations/new': {
        element: <ConversationView />,
      },
      '/conversations/{conversationId}': {
        params: t.intersection([
          t.type({
            path: t.type({
              conversationId: t.string,
            }),
          }),
          t.partial({
            state: t.partial({
              prevConversationKey: t.string,
            }),
          }),
        ]),
        element: <ConversationView />,
      },
    },
  },
};

export type ObservabilityRoutes = typeof observabilityRoutes;

export const observabilityRouter = createRouter(observabilityRoutes);

export type ObservabilityRouter = typeof observabilityRouter;
