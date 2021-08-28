/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import {
  checkGetJobsCapabilitiesResolver,
  checkPermission,
} from '../../../capabilities/check_capabilities';
import type { NavigateToPath } from '../../../contexts/kibana/use_navigate_to_path';
import { useTimefilter } from '../../../contexts/kibana/use_timefilter';
import { checkFullLicense } from '../../../license/check_license';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { AnomalyDetectionSettingsContext } from '../../../settings/anomaly_detection_settings_context';
import { Settings } from '../../../settings/settings';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import type { MlRoute, PageProps } from '../../router';
import { PageLoader } from '../../router';
import { useResolver } from '../../use_resolver';

export const settingsRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/settings',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB', navigateToPath, basePath),
  ],
});

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;

  const { context } = useResolver(undefined, undefined, deps.config, {
    checkFullLicense,
    checkGetJobsCapabilities: () => checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
    getMlNodeCount,
  });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  const canGetFilters = checkPermission('canGetFilters');
  const canCreateFilter = checkPermission('canCreateFilter');
  const canGetCalendars = checkPermission('canGetCalendars');
  const canCreateCalendar = checkPermission('canCreateCalendar');

  return (
    <PageLoader context={context}>
      <AnomalyDetectionSettingsContext.Provider
        value={{ canGetFilters, canCreateFilter, canGetCalendars, canCreateCalendar }}
      >
        <Settings />
      </AnomalyDetectionSettingsContext.Provider>
    </PageLoader>
  );
};
