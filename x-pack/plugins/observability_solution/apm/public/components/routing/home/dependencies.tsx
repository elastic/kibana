/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import { Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { Redirect } from 'react-router-dom';
import qs from 'query-string';
import { dynamic } from '@kbn/shared-ux-utility';
import { page } from './page_template';
import { offsetRt } from '../../../../common/comparison_rt';
import { TransactionTab } from '../../app/transaction_details/waterfall_with_summary/transaction_tabs';
import { useApmParams } from '../../../hooks/use_apm_params';

const DependencyDetailOperations = dynamic(() =>
  import('../../app/dependency_detail_operations').then((mod) => ({
    default: mod.DependencyDetailOperations,
  }))
);
const DependencyDetailOverview = dynamic(() =>
  import('../../app/dependency_detail_overview').then((mod) => ({
    default: mod.DependencyDetailOverview,
  }))
);
const DependencyDetailView = dynamic(() =>
  import('../../app/dependency_detail_view').then((mod) => ({ default: mod.DependencyDetailView }))
);
const DependenciesInventory = dynamic(() =>
  import('../../app/dependencies_inventory').then((mod) => ({ default: mod.DependenciesInventory }))
);
const DependencyOperationDetailView = dynamic(() =>
  import('../../app/dependency_operation_detail_view').then((mod) => ({
    default: mod.DependencyOperationDetailView,
  }))
);

export const DependenciesInventoryTitle = i18n.translate(
  'xpack.apm.views.dependenciesInventory.title',
  { defaultMessage: 'Dependencies' }
);

function RedirectDependenciesToDependenciesOverview() {
  const { query } = useApmParams('/dependencies');
  const search = qs.stringify(query);
  return <Redirect to={{ pathname: `/dependencies/overview`, search }} />;
}

export const dependencies = {
  ...page({
    path: '/dependencies/inventory',
    title: DependenciesInventoryTitle,
    element: <DependenciesInventory />,
    params: t.partial({
      query: t.intersection([
        t.type({
          comparisonEnabled: toBooleanRt,
        }),
        offsetRt,
      ]),
    }),
  }),
  '/dependencies': {
    element: (
      <DependencyDetailView>
        <Outlet />
      </DependencyDetailView>
    ),
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
      '/dependencies': {
        element: <RedirectDependenciesToDependenciesOverview />,
      },
      '/dependencies/operations': {
        element: <DependencyDetailOperations />,
      },
      '/dependencies/operation': {
        params: t.type({
          query: t.intersection([
            t.type({
              spanName: t.string,
              detailTab: t.union([
                t.literal(TransactionTab.timeline),
                t.literal(TransactionTab.metadata),
                t.literal(TransactionTab.logs),
              ]),
              showCriticalPath: toBooleanRt,
            }),
            t.partial({
              spanId: t.string,
              sampleRangeFrom: toNumberRt,
              sampleRangeTo: toNumberRt,
              waterfallItemId: t.string,
              flyoutDetailTab: t.string,
            }),
          ]),
        }),
        defaults: {
          query: {
            detailTab: TransactionTab.timeline,
            showCriticalPath: '',
          },
        },
        element: <DependencyOperationDetailView />,
      },
      '/dependencies/overview': {
        element: <DependencyDetailOverview />,
      },
    },
  },
};
