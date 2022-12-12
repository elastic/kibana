/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { defer, Navigate, RouteProps } from 'react-router-dom';
import { HttpSetup } from '@kbn/core-http-browser';
import { casesPath } from '../../common';
import { CasesPage } from '../pages/cases';
import { AlertsPage } from '../pages/alerts/containers/alerts_page';
import { OverviewPage } from '../pages/overview';
import { jsonRt } from './json_rt';
import { ObservabilityExploratoryView } from '../components/shared/exploratory_view/obsv_exploratory_view';
import { RulesPage } from '../pages/rules';
import { RuleDetailsPage } from '../pages/rule_details';
import { AlertingPages } from '../config';
import { AlertDetails } from '../pages/alert_details';
import { DatePickerContextProvider } from '../context/date_picker_context';
import { SlosPage } from '../pages/slos';
import { getNewsFeed } from '../services/get_news_feed';
import { getDataHandler } from '../data_handler';
import { getAbsoluteTime } from '../utils/date';
import { calculateBucketSize } from '../pages/overview/containers/overview_page/helpers';

export type RoutesType = ReturnType<typeof getRoutes>;
export type RouteParams<T extends keyof RoutesType> = DecodeParams<RoutesType[T]['paramType']>;

type DecodeParams<TParams extends Params | undefined> = {
  [key in keyof TParams]: TParams[key] extends t.Any ? t.TypeOf<TParams[key]> : never;
};

export interface Params {
  query?: t.HasProps;
  path?: t.HasProps;
}

// Note: React Router DOM <Redirect> component was not working here
// so I've recreated this simple version for this purpose.
// function SimpleRedirect({ to }: { to: string }) {
//   return <Navigate to={to} />;
// }

export const getRoutes = (http: HttpSetup): Record<string, RouteProps & { paramType: Params }> => ({
  '*': {
    element: <Navigate to="/overview" />,
    paramType: {},
    loader: async ({ request }) => {
      console.log('loader redirect');
      return {};
    },
  },
  landing: {
    element: <Navigate to="/overview" />,
    paramType: {},
    loader: async ({ request }) => {
      console.log('loader landing');
      return {};
    },
  },
  overview: {
    element: (
      <DatePickerContextProvider>
        <OverviewPage />
      </DatePickerContextProvider>
    ),
    loader: async ({ request }) => {
      console.log('overview');
      const url = new URL(request.url);

      const { rangeFrom, rangeTo } = new Proxy(new URLSearchParams(url.search), {
        get: (searchParams, prop) => searchParams.get(prop as string),
      }) as {
        rangeFrom?: string;
        rangeTo?: string;
        refreshPaused?: boolean;
        refreshInterval?: number;
      };

      const relativeStart = rangeFrom as string;
      const relativeEnd = rangeTo as string;

      const absoluteStart = getAbsoluteTime(relativeStart as string);
      const absoluteEnd = getAbsoluteTime(relativeEnd as string);

      const bucketSize = calculateBucketSize({
        start: absoluteStart,
        end: absoluteEnd,
      });

      const getLogEvents = () => {
        if (bucketSize && absoluteStart && absoluteEnd)
          return getDataHandler('infra_logs')?.fetchData({
            absoluteTime: { start: absoluteStart, end: absoluteEnd },
            relativeTime: { start: relativeStart, end: relativeEnd },
            ...bucketSize,
          });
      };

      const getInfra = () => {
        if (bucketSize && absoluteStart && absoluteEnd) {
          return getDataHandler('infra_metrics')?.fetchData({
            absoluteTime: {
              start: absoluteStart as number,
              end: absoluteEnd as number,
            },
            relativeTime: { start: relativeStart, end: relativeEnd },
            ...bucketSize,
          });
        }
      };

      return defer({
        newsFeed: getNewsFeed({ http }),
        metrics: getInfra(),
        logEvents: getLogEvents(),
      });
    },
    paramType: {},
  },
  [`${casesPath}/*`]: {
    element: (
      <TrackApplicationView viewId={AlertingPages.cases}>
        <CasesPage />
      </TrackApplicationView>
    ),
    paramType: {},
  },
  alerts: {
    element: (
      <TrackApplicationView viewId={AlertingPages.alerts}>
        <AlertsPage />
      </TrackApplicationView>
    ),
    paramType: {},
  },
  'exploratory-view/': {
    element: <ObservabilityExploratoryView />,

    paramType: {
      query: t.partial({
        rangeFrom: t.string,
        rangeTo: t.string,
        refreshPaused: jsonRt.pipe(t.boolean),
        refreshInterval: jsonRt.pipe(t.number),
      }),
    },
    // exact: true,
  },
  'alerts/rules': {
    element: (
      <TrackApplicationView viewId={AlertingPages.rules}>
        <RulesPage />
      </TrackApplicationView>
    ),
    paramType: {},
    // params: {},
    // exact: true,
  },
  'alerts/rules/:ruleId': {
    element: <RuleDetailsPage />,
    paramType: {},

    // params: {},
    // exact: true,
  },
  'alerts/:alertId': {
    element: <AlertDetails />,
    paramType: {},
    // params: {},
    // exact: true,
  },
  slos: {
    element: <SlosPage />,
    paramType: {},
    // },
    // params: {},
    // exact: true,
  },
});
