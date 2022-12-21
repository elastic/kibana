/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaFramework } from '../../lib/adapters/framework/kibana_framework_adapter';
import { InfraPluginStartServicesAccessor } from '../../types';
import { initGetLogViewRoute } from './get_log_view';
import { initPutLogViewRoute } from './put_log_view';

export const initLogViewRoutes = (dependencies: {
  framework: KibanaFramework;
  getStartServices: InfraPluginStartServicesAccessor;
}) => {
  initGetLogViewRoute(dependencies);
  initPutLogViewRoute(dependencies);
};
