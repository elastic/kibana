/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DashboardReference,
  GetDashboardsSectionsResponse,
  ObsDashboardSections,
} from '../../../common/dashboards';
import { OBS_DASHBOARD_SECTIONS_SO_TYPE } from '../../lib/dashboards';
import { createObservabilityServerRoute } from '../create_observability_server_route';

const getDashboardSectionsRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/dashboards/sections 2024-03-10',
  options: {
    tags: [],
  },
  handler: async ({ context, dependencies, request }): Promise<GetDashboardsSectionsResponse> => {
    const soClient = (await context.core).savedObjects.getClient({
      includedHiddenTypes: [OBS_DASHBOARD_SECTIONS_SO_TYPE],
    });
    const sectionsSo = (
      await soClient.find<ObsDashboardSections>({
        type: OBS_DASHBOARD_SECTIONS_SO_TYPE,
      })
    ).saved_objects[0];

    const spaceId = dependencies.spaces?.spacesService.getSpaceId(request);
    const packageService = dependencies.fleet.packageService.asScoped(request);
    const packages = await packageService.getPackages();
    const installedPackages = packages.filter(
      (pkg) =>
        pkg.status === 'installed' &&
        pkg.savedObject?.attributes.installed_kibana_space_id === spaceId
    );

    const packagesWithDashboard = installedPackages.filter((pkg) => {
      if (!pkg.savedObject) {
        return false;
      }
      const kibanaAssets = pkg.savedObject.attributes.installed_kibana;
      return kibanaAssets.some((asset) => asset.type === 'dashboard');
    });

    if (sectionsSo) {
      // return { sections: sectionsSo.attributes };
    }

    // I'll need to merge whatever is found with whatever is installed, so that:
    // If a new Integration is added, that section shows up
    // If an Integration is removed, that section is deleted (unless it has custom dashboards attached?)
    // Similar to how we resolve log views

    return {
      sections: packagesWithDashboard.map((pkg) => ({
        title: pkg.title,
        dashboards: pkg.savedObject!.attributes.installed_kibana.filter<DashboardReference>(
          (asset): asset is DashboardReference => asset.type === 'dashboard'
        ),
      })),
    };
  },
});

export const dashboardsRouteRepository = {
  ...getDashboardSectionsRoute,
};
