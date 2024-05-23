/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CLOUD_SECURITY_POSTURE_BASE_PATH } from '@kbn/cloud-security-posture-plugin/public';
import type { SecuritySubPlugin } from '../app/types';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';

const CloudSecurityPostureLazy = React.lazy(() =>
  import(
    /* webpackChunkName: "sub_plugin-cloud_security_posture" */
    './routes'
  ).then(({ CloudSecurityPosture }) => ({ default: CloudSecurityPosture }))
);

export class CloudSecurityPosture {
  public setup() {}

  public start(): SecuritySubPlugin {
    return {
      routes: [
        {
          path: CLOUD_SECURITY_POSTURE_BASE_PATH,
          component: withSubPluginRouteSuspense(CloudSecurityPostureLazy),
        },
      ],
    };
  }
}
