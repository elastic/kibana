/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObsDashboardSections } from '../../../common/dashboards';
import { OBS_DASHBOARD_SECTIONS_SO_TYPE } from '../../lib/dashboards';
import { createObservabilityServerRoute } from '../create_observability_server_route';

const getDashboardSectionsRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/dashboards/sections 2024-03-10',
  options: {
    tags: [],
  },
  handler: async ({ context, dependencies, request }) => {
    const soClient = (await context.core).savedObjects.getClient({
      includedHiddenTypes: [OBS_DASHBOARD_SECTIONS_SO_TYPE],
    });
    const sectionsSo = (
      await soClient.find<ObsDashboardSections>({
        type: OBS_DASHBOARD_SECTIONS_SO_TYPE,
      })
    ).saved_objects[0];

    if (sectionsSo) {
      return { sections: sectionsSo.attributes };
    }

    // I'll need to merge whatever is found with whatever is installed, so that:
    // If a new Integration is added, that section shows up
    // If an Integration is removed, that section is deleted (unless it has custom dashboards attached?)

    return { sections: [{ title: 'MySQL' }, { title: 'Elasticsearch' }, { title: 'MongoDB' }] };
  },
});

export const dashboardsRouteRepository = {
  ...getDashboardSectionsRoute,
};
