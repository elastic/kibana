/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Outlet } from '@kbn/typed-react-router-config';
import { z } from '@kbn/zod/v4';
import React from 'react';
import { Redirect } from 'react-router-dom';
import qs from 'query-string';
import { toBooleanFromString } from '../../../../common/utils/to_boolean_from_string';
import { offsetSchema } from '../../../../common/comparison_rt';
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
    params: z.object({
      query: z.object({ comparisonEnabled: toBooleanFromString }).merge(offsetSchema).optional(),
    }),
  },
  '/backends/{dependencyName}/overview': {
    element: <RedirectBackendsOverviewToDependenciesOverview />,
    params: z.object({ path: z.object({ dependencyName: z.string() }) }),
  },
  '/backends': {
    element: <Outlet />,
    params: z.object({
      query: z
        .object({
          comparisonEnabled: toBooleanFromString,
          dependencyName: z.string(),
        })
        .merge(offsetSchema)
        .optional(),
    }),
    children: {
      '/backends': {
        element: <RedirectBackends to="/dependencies" />,
      },
      '/backends/operations': {
        element: <RedirectBackends to="/dependencies/operations" />,
      },
      '/backends/operation': {
        params: z.object({
          query: z.object({ spanName: z.string() }).merge(
            z.object({
              sampleRangeFrom: z.coerce.number().optional(),
              sampleRangeTo: z.coerce.number().optional(),
            })
          ),
        }),
        element: <RedirectBackends to="/dependencies/operation" />,
      },
      '/backends/overview': {
        element: <RedirectBackends to="/dependencies/overview" />,
      },
    },
  },
};
