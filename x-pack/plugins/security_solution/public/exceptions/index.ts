/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

import { EXCEPTIONS_PATH } from '../../common/constants';
import type { SecuritySubPlugin } from '../app/types';
import { DETECTIONS_TABLE_IDS } from '../detections';
import { getDataTablesInStorageByIds } from '../timelines/containers/local_storage';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';

const ExceptionsLazy = React.lazy(() =>
  import(
    /* webpackChunkName: "sub_plugin-exceptions" */
    './routes'
  ).then(({ Exceptions }) => ({ default: Exceptions }))
);

export class Exceptions {
  public setup() {}

  public start(storage: Storage): SecuritySubPlugin {
    return {
      storageDataTables: {
        tableById: getDataTablesInStorageByIds(storage, DETECTIONS_TABLE_IDS),
      },
      routes: [
        {
          path: EXCEPTIONS_PATH,
          component: withSubPluginRouteSuspense(ExceptionsLazy),
        },
      ],
    };
  }
}
