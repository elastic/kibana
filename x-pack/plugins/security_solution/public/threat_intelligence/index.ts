/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { THREAT_INTELLIGENCE_BASE_PATH } from '@kbn/threat-intelligence-plugin/public';
import type { SecuritySubPlugin } from '../app/types';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';

const ThreatIntelligenceLazy = React.lazy(() =>
  import(
    /* webpackChunkName: "sub_plugin-threat_intelligence" */
    './routes'
  ).then(({ ThreatIntelligence }) => ({ default: ThreatIntelligence }))
);

export class ThreatIntelligence {
  public setup() {}

  public start(): SecuritySubPlugin {
    return {
      routes: [
        {
          path: THREAT_INTELLIGENCE_BASE_PATH,
          component: withSubPluginRouteSuspense(ThreatIntelligenceLazy),
        },
      ],
    };
  }
}
