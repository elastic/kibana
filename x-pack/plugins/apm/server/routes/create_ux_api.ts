/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rumOverviewLocalFiltersRoute } from './ui_filters';

import { ServerAPI } from './typings';
import {
  rumClientMetricsRoute,
  rumJSErrors,
  rumLongTaskMetrics,
  rumPageLoadDistBreakdownRoute,
  rumPageLoadDistributionRoute,
  rumPageViewsTrendRoute,
  rumServicesRoute,
  rumUrlSearch,
  rumVisitorsBreakdownRoute,
  rumWebCoreVitals,
} from './rum_client';

export const createUXAPIRoutes = (api: ServerAPI<{}>) => {
  api
    // Rum Overview
    .add(rumOverviewLocalFiltersRoute)
    .add(rumPageViewsTrendRoute)
    .add(rumPageLoadDistributionRoute)
    .add(rumPageLoadDistBreakdownRoute)
    .add(rumClientMetricsRoute)
    .add(rumServicesRoute)
    .add(rumVisitorsBreakdownRoute)
    .add(rumWebCoreVitals)
    .add(rumJSErrors)
    .add(rumUrlSearch)
    .add(rumLongTaskMetrics);
};
