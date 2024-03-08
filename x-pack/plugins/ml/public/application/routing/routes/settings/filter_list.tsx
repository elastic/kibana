/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useTimefilter } from '@kbn/ml-date-picker';
import { ML_PAGES } from '../../../../locator';
import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { usePermissionCheck } from '../../../capabilities/check_capabilities';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { FilterLists } from '../../../settings/filter_lists';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const filterListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.FILTER_LISTS_MANAGE),
  title: i18n.translate('xpack.ml.settings.filterList.docTitle', {
    defaultMessage: 'Filters',
  }),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('FILTER_LISTS_BREADCRUMB'),
  ],
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetFilters'], { getMlNodeCount });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  const [canCreateFilter, canDeleteFilter] = usePermissionCheck([
    'canCreateFilter',
    'canDeleteFilter',
  ]);

  return (
    <PageLoader context={context}>
      <FilterLists {...{ canCreateFilter, canDeleteFilter }} />
    </PageLoader>
  );
};
