/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import * as t from 'io-ts';
import { i18n } from '@kbn/i18n';
import { HomePage } from '../pages/home';
import { LandingPage } from '../pages/landing';
import { OverviewPage } from '../pages/overview';
import { jsonRt } from './json_rt';

export type RouteParams<T extends keyof typeof routes> = DecodeParams<typeof routes[T]['params']>;

type DecodeParams<TParams extends Params | undefined> = {
  [key in keyof TParams]: TParams[key] extends t.Any ? t.TypeOf<TParams[key]> : never;
};

export type Breadcrumbs = Array<{ text: string }>;

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
    breadcrumb: [
      {
        text: i18n.translate('xpack.observability.home.breadcrumb', {
          defaultMessage: 'Overview',
        }),
      },
    ],
  },
  '/landing': {
    handler: () => {
      return <LandingPage />;
    },
    params: {},
    breadcrumb: [
      {
        text: i18n.translate('xpack.observability.landing.breadcrumb', {
          defaultMessage: 'Getting started',
        }),
      },
    ],
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
    breadcrumb: [
      {
        text: i18n.translate('xpack.observability.overview.breadcrumb', {
          defaultMessage: 'Overview',
        }),
      },
    ],
  },
};
