/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
import { HeartbeatKibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { HeartbeatFrontendLibs } from '../lib';

export function compose(): HeartbeatFrontendLibs {
  const libs: HeartbeatFrontendLibs = {
    framework: new HeartbeatKibanaFrameworkAdapter(uiRoutes),
  };

  return libs;
}
