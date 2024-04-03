/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../types';

import { registerDataStreamRoutes } from './api/data_streams';
import { registerIndicesRoutes } from './api/indices';
import { registerTemplateRoutes } from './api/templates';
import { registerSettingsRoutes } from './api/settings';
import { registerStatsRoute } from './api/stats';
import { registerComponentTemplateRoutes } from './api/component_templates';
import { registerNodesRoute } from './api/nodes';
import { registerEnrichPoliciesRoute } from './api/enrich_policies';
import { registerIndexMappingRoutes } from './api/mapping/register_index_mapping_route';

export class ApiRoutes {
  setup(dependencies: RouteDependencies) {
    registerDataStreamRoutes(dependencies);
    registerIndicesRoutes(dependencies);
    registerTemplateRoutes(dependencies);
    registerSettingsRoutes(dependencies);
    registerIndexMappingRoutes(dependencies);
    registerComponentTemplateRoutes(dependencies);
    registerNodesRoute(dependencies);
    registerEnrichPoliciesRoute(dependencies);

    if (dependencies.config.isIndexStatsEnabled !== false) {
      registerStatsRoute(dependencies);
    }
  }

  start() {}
  stop() {}
}
