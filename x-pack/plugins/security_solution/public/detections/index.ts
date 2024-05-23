/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { TableId } from '@kbn/securitysolution-data-table';
import type { TableIdLiteral } from '@kbn/securitysolution-data-table';
import { ALERTS_PATH, DETECTIONS_PATH } from '../../common/constants';
import { getDataTablesInStorageByIds } from '../timelines/containers/local_storage';
import type { SecuritySubPlugin } from '../app/types';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';

export const DETECTIONS_TABLE_IDS: TableIdLiteral[] = [
  TableId.alertsOnRuleDetailsPage,
  TableId.alertsOnAlertsPage,
];

const loadRoutes = () =>
  import(
    /* webpackChunkName: "sub_plugin-detections" */
    './routes'
  );

const AlertsRoutesLazy = React.lazy(() =>
  loadRoutes().then(({ AlertsRoutes }) => ({ default: AlertsRoutes }))
);
const LegacyDetectionsRouteLazy = React.lazy(() =>
  loadRoutes().then(({ LegacyDetectionsRoute }) => ({ default: LegacyDetectionsRoute }))
);

export class Detections {
  public setup() {}

  public start(storage: Storage): SecuritySubPlugin {
    return {
      storageDataTables: {
        tableById: getDataTablesInStorageByIds(storage, DETECTIONS_TABLE_IDS),
      },
      routes: [
        {
          path: DETECTIONS_PATH,
          component: withSubPluginRouteSuspense(LegacyDetectionsRouteLazy),
        },
        {
          path: ALERTS_PATH,
          component: withSubPluginRouteSuspense(AlertsRoutesLazy),
        },
      ],
    };
  }
}
