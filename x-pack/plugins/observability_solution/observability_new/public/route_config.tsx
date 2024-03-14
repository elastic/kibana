/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toBooleanRt } from '@kbn/io-ts-utils';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { offsetRt } from '../common/features/apm/comparison_rt';
import { ObservabilityAIAssistantPageTemplate } from './features/ai_assistant/components/page_template';
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
import { Breadcrumb } from './features/apm/components/app/breadcrumb';
import { diagnosticsRoute } from './features/apm/components/app/diagnostics';
import { ServiceGroupsList } from './features/apm/components/app/service_groups';
import { TraceLink } from './features/apm/components/app/trace_link';
import { TransactionLink } from './features/apm/components/app/transaction_link';
import { homeRoute } from './features/apm/components/routing/home';
import { mobileServiceDetailRoute } from './features/apm/components/routing/mobile_service_detail';
import { onboarding } from './features/apm/components/routing/onboarding';
import { tutorialRedirectRoute } from './features/apm/components/routing/onboarding/redirect';
import { serviceDetailRoute } from './features/apm/components/routing/service_detail';
import { settingsRoute } from './features/apm/components/routing/settings';
import { ApmMainTemplate } from './features/apm/components/routing/templates/apm_main_template';

export const observabilityRoutes = {
  '/': {
    element: <Redirect to={'/overview'} />,
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
        params: t.type({
          query: t.partial({
            _a: t.string,
          }),
        }),
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
          query: t.partial({
            instanceId: t.string,
          }),
        }),
      },
    },
  },
  '/conversations': {
    element: (
      <ObservabilityAIAssistantPageTemplate>
        <Outlet />
      </ObservabilityAIAssistantPageTemplate>
    ),
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
      '/conversations': {
        element: <Redirect to="/conversations/new" />,
      },
    },
  },
  '/link-to/transaction/{transactionId}': {
    element: <TransactionLink />,
    params: t.intersection([
      t.type({
        path: t.type({
          transactionId: t.string,
        }),
      }),
      t.partial({
        query: t.partial({
          rangeFrom: t.string,
          rangeTo: t.string,
          waterfallItemId: t.string,
        }),
      }),
    ]),
  },
  '/link-to/trace/{traceId}': {
    element: <TraceLink />,
    params: t.intersection([
      t.type({
        path: t.type({
          traceId: t.string,
        }),
      }),
      t.partial({
        query: t.partial({
          rangeFrom: t.string,
          rangeTo: t.string,
        }),
      }),
    ]),
  },
  '/apm': {
    element: (
      <Breadcrumb title="APM" href="/">
        <Outlet />
      </Breadcrumb>
    ),
    children: {
      // this route fails on navigation unless it's defined before home
      '/service-groups': {
        element: (
          <Breadcrumb title={ServiceGroupsTitle} href={'/service-groups'}>
            <ApmMainTemplate
              pageTitle={ServiceGroupsTitle}
              environmentFilter={false}
              showServiceGroupSaveButton={false}
              showServiceGroupsNav
              selectedNavButton="serviceGroups"
            >
              <ServiceGroupsList />
            </ApmMainTemplate>
          </Breadcrumb>
        ),
        params: t.type({
          query: t.intersection([
            t.type({
              rangeFrom: t.string,
              rangeTo: t.string,
              comparisonEnabled: toBooleanRt,
            }),
            t.partial({
              serviceGroup: t.string,
            }),
            t.partial({
              refreshPaused: t.union([t.literal('true'), t.literal('false')]),
              refreshInterval: t.string,
            }),
            offsetRt,
          ]),
        }),
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

export type ObservabilityRoutes = typeof observabilityRoutes;

export const observabilityRouter = createRouter(observabilityRoutes);

export type ObservabilityRouter = typeof observabilityRouter;
