/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import React from 'react';

import { COVERAGE_OVERVIEW_PATH, RULES_LANDING_PATH, RULES_PATH } from '../../common/constants';
import type { SecuritySubPlugin } from '../app/types';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';
import { DETECTIONS_TABLE_IDS } from '../detections';
import { getDataTablesInStorageByIds } from '../timelines/containers/local_storage';

const loadRoutes = () =>
  import(
    /* webpackChunkName: "sub_plugin-rules" */
    './routes'
  );

const RulesLandingPageLazy = React.lazy(() =>
  loadRoutes().then(({ RulesLandingPage }) => ({ default: RulesLandingPage }))
);
const RulesLazy = React.lazy(() => loadRoutes().then(({ Rules }) => ({ default: Rules })));
const CoverageOverviewRoutesLazy = React.lazy(() =>
  loadRoutes().then(({ CoverageOverviewRoutes }) => ({ default: CoverageOverviewRoutes }))
);

export class Rules {
  public setup() {}

  public start(storage: Storage): SecuritySubPlugin {
    return {
      storageDataTables: {
        tableById: getDataTablesInStorageByIds(storage, DETECTIONS_TABLE_IDS),
      },
      routes: [
        {
          path: RULES_LANDING_PATH,
          component: withSubPluginRouteSuspense(RulesLandingPageLazy),
        },
        {
          path: RULES_PATH,
          component: withSubPluginRouteSuspense(RulesLazy),
        },
        {
          path: COVERAGE_OVERVIEW_PATH,
          component: withSubPluginRouteSuspense(CoverageOverviewRoutesLazy),
        },
      ],
    };
  }
}
