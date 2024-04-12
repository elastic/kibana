/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

const withSuspenseIcon = <T extends object = {}>(Component: React.ComponentType<T>): React.FC<T> =>
  function WithSuspenseIcon(props) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="s" />}>
        <Component {...props} />
      </Suspense>
    );
  };

export const IconLensLazy = withSuspenseIcon(React.lazy(() => import('./icons/lens')));
export const IconEndpointLazy = withSuspenseIcon(React.lazy(() => import('./icons/endpoint')));
export const IconFleetLazy = withSuspenseIcon(React.lazy(() => import('./icons/fleet')));
export const IconEcctlLazy = withSuspenseIcon(React.lazy(() => import('./icons/ecctl')));

export const IconTimelineLazy = withSuspenseIcon(React.lazy(() => import('./icons/timeline')));
export const IconOsqueryLazy = withSuspenseIcon(React.lazy(() => import('./icons/osquery')));
export const IconVisualizationLazy = withSuspenseIcon(
  React.lazy(() => import('./icons/visualization'))
);
export const IconMarketingLazy = withSuspenseIcon(React.lazy(() => import('./icons/marketing')));
export const IconInfraLazy = withSuspenseIcon(React.lazy(() => import('./icons/infra')));
export const IconKeywordLazy = withSuspenseIcon(React.lazy(() => import('./icons/keyword')));
export const IconJobsLazy = withSuspenseIcon(React.lazy(() => import('./icons/jobs')));
export const IconSettingsLazy = withSuspenseIcon(React.lazy(() => import('./icons/settings')));
export const IconDashboardLazy = withSuspenseIcon(React.lazy(() => import('./icons/dashboard')));
export const IconChartArrowLazy = withSuspenseIcon(React.lazy(() => import('./icons/chart_arrow')));
export const IconManagerLazy = withSuspenseIcon(React.lazy(() => import('./icons/manager')));
export const IconFilebeatLazy = withSuspenseIcon(React.lazy(() => import('./icons/filebeat')));
export const IconDataViewLazy = withSuspenseIcon(React.lazy(() => import('./icons/data_view')));
export const IconReplicationLazy = withSuspenseIcon(
  React.lazy(() => import('./icons/replication'))
);
export const IconIntuitiveLazy = withSuspenseIcon(React.lazy(() => import('./icons/intuitive')));
export const IconRapidBarGraphLazy = withSuspenseIcon(
  React.lazy(() => import('./icons/rapid_bar_graph'))
);
export const IconFilebeatChartLazy = withSuspenseIcon(
  React.lazy(() => import('./icons/filebeat_chart'))
);
