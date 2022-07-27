/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import { Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { Redirect } from 'react-router-dom';
import qs from 'query-string';
import { offsetRt } from '../../../../common/comparison_rt';
import { useApmParams } from '../../../hooks/use_apm_params';

function RedirectBackends({ to }: { to: string }) {
  const { query } = useApmParams('/backends/*');
  const search = qs.stringify(query);
  return <Redirect to={{ pathname: to, search }} />;
}

function RedirectBackendsOverviewToDependenciesOverview() {
  const {
    path: { dependencyName },
    query,
  } = useApmParams('/backends/{dependencyName}/overview');

  const search = qs.stringify({ ...query, dependencyName });

  return <Redirect to={{ pathname: `/dependencies/overview`, search }} />;
}

export const legacyBackends = {
  '/backends/inventory': {
    element: <RedirectBackends to="/dependencies/inventory" />,
    params: t.partial({
      query: t.intersection([
        t.type({ comparisonEnabled: toBooleanRt }),
        offsetRt,
      ]),
    }),
  },
  '/backends/{dependencyName}/overview': {
    element: <RedirectBackendsOverviewToDependenciesOverview />,
    params: t.type({ path: t.type({ dependencyName: t.string }) }),
  },
  '/backends': {
    element: <Outlet />,
    params: t.partial({
      query: t.intersection([
        t.type({
          comparisonEnabled: toBooleanRt,
          dependencyName: t.string,
        }),
        offsetRt,
      ]),
    }),
    children: {
      '/backends': {
        element: <RedirectBackends to="/dependencies" />,
      },
      '/backends/operations': {
        element: <RedirectBackends to="/dependencies/operations" />,
      },
      '/backends/operation': {
        params: t.type({
          query: t.intersection([
            t.type({ spanName: t.string }),
            t.partial({
              sampleRangeFrom: toNumberRt,
              sampleRangeTo: toNumberRt,
            }),
          ]),
        }),
        element: <RedirectBackends to="/dependencies/operation" />,
      },
      '/backends/overview': {
        element: <RedirectBackends to="/dependencies/overview" />,
      },
    },
  },
};
