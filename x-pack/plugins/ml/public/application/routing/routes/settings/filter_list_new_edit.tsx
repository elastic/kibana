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
import { dynamic } from '@kbn/shared-ux-utility';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { usePermissionCheck } from '../../../capabilities/check_capabilities';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute, PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

enum MODE {
  NEW,
  EDIT,
}

interface NewFilterPageProps extends PageProps {
  mode: MODE;
}

const EditFilterList = dynamic(async () => ({
  default: (await import('../../../settings/filter_lists')).EditFilterList,
}));

export const newFilterListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.FILTER_LISTS_NEW),
  title: i18n.translate('xpack.ml.settings.createFilter.docTitle', {
    defaultMessage: 'Create Filter',
  }),
  render: (props, deps) => <PageWrapper {...props} mode={MODE.NEW} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('FILTER_LISTS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.filterLists.createLabel', {
        defaultMessage: 'Create',
      }),
    },
  ],
});

export const editFilterListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.FILTER_LISTS_EDIT, '/:filterId'),
  title: i18n.translate('xpack.ml.settings.editFilter.docTitle', {
    defaultMessage: 'Edit Filter',
  }),
  render: (props, deps) => <PageWrapper {...props} mode={MODE.EDIT} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('FILTER_LISTS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.filterLists.editLabel', {
        defaultMessage: 'Edit',
      }),
    },
  ],
});

const PageWrapper: FC<NewFilterPageProps> = ({ location, mode }) => {
  let filterId: string | undefined;
  if (mode === MODE.EDIT) {
    const pathMatch: string[] | null = location.pathname.match(/.+\/(.+)$/);
    filterId = pathMatch && pathMatch.length > 1 ? pathMatch[1] : undefined;
  }

  const { context } = useRouteResolver('full', ['canGetFilters', 'canCreateFilter'], {
    getMlNodeCount,
  });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  const [canCreateFilter, canDeleteFilter] = usePermissionCheck([
    'canCreateFilter',
    'canDeleteFilter',
  ]);

  return (
    <PageLoader context={context}>
      <EditFilterList
        {...{
          filterId,
          canCreateFilter,
          canDeleteFilter,
        }}
      />
    </PageLoader>
  );
};
