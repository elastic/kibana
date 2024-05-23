/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SecuritySubPlugin } from '../app/types';
import { INVESTIGATIONS_PATH } from '../../common/constants';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';

const InvestigationsPageLazy = React.lazy(() =>
  import(
    /* webpackChunkName: "sub_plugin-investigations" */
    './routes'
  ).then(({ InvestigationsPage }) => ({ default: InvestigationsPage }))
);

export class Investigations {
  public setup() {}

  public start(): SecuritySubPlugin {
    return {
      routes: [
        {
          path: INVESTIGATIONS_PATH,
          component: withSubPluginRouteSuspense(InvestigationsPageLazy),
        },
      ],
    };
  }
}
