/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';
import { UMKibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { UMFrontendLibs } from '../lib';

export function compose(): UMFrontendLibs {
  const libs: UMFrontendLibs = {
    framework: new UMKibanaFrameworkAdapter(uiRoutes),
  };

  return libs;
}
