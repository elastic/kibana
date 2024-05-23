/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KUBERNETES_PATH } from '@kbn/kubernetes-security-plugin/public';
import type { SecuritySubPlugin } from '../app/types';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';

const KubernetesRoutesLazy = React.lazy(() =>
  import(
    /* webpackChunkName: "sub_plugin-kubernetes" */
    './routes'
  ).then(({ KubernetesRoutes }) => ({ default: KubernetesRoutes }))
);

export class Kubernetes {
  public setup() {}

  public start(): SecuritySubPlugin {
    return {
      routes: [
        {
          path: KUBERNETES_PATH,
          component: withSubPluginRouteSuspense(KubernetesRoutesLazy),
        },
      ],
    };
  }
}
