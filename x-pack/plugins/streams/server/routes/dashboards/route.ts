/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Asset, Dashboard } from '../../../common/assets';
import { createServerRoute } from '../create_server_route';

export interface ListDashboardsResponse {
  dashboards: Dashboard[];
}

export interface LinkDashboardResponse {
  acknowledged: boolean;
}

export interface UnlinkDashboardResponse {
  acknowledged: boolean;
}

export interface SuggestDashboardResponse {
  suggestions: Array<{
    dashboard: Dashboard;
  }>;
}

export const listDashboardsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}/dashboards',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
  }),
  async handler({ params, request, assets }): Promise<ListDashboardsResponse> {
    const assetsClient = await assets.getClientWithRequest({ request });

    const {
      path: { id: streamId },
    } = params;

    function isDashboard(asset: Asset): asset is Dashboard {
      return asset.type === 'dashboard';
    }

    return {
      dashboards: (
        await assetsClient.getAssets({
          entityId: streamId,
          entityType: 'stream',
        })
      ).filter(isDashboard),
    };
  },
});

export const linkDashboardRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{id}/dashboards/{dashboardId}',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      id: z.string(),
      dashboardId: z.string(),
    }),
  }),
  handler: async ({ params, request, assets }): Promise<LinkDashboardResponse> => {
    const assetsClient = await assets.getClientWithRequest({ request });

    const {
      path: { dashboardId, id: streamId },
    } = params;

    await assetsClient.linkAsset({
      entityId: streamId,
      entityType: 'stream',
      assetId: dashboardId,
      assetType: 'dashboard',
    });

    return {
      acknowledged: true,
    };
  },
});

export const unlinkDashboardRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{id}/dashboards/{dashboardId}',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      id: z.string(),
      dashboardId: z.string(),
    }),
  }),
  handler: async ({ params, request, assets }): Promise<UnlinkDashboardResponse> => {
    const assetsClient = await assets.getClientWithRequest({ request });

    const {
      path: { dashboardId, id: streamId },
    } = params;

    await assetsClient.unlinkAsset({
      entityId: streamId,
      entityType: 'stream',
      assetId: dashboardId,
      assetType: 'dashboard',
    });

    return {
      acknowledged: true,
    };
  },
});

export const suggestDashboardsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}/dashboards/_suggestions',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
    query: z.object({
      query: z.string(),
    }),
  }),
  handler: async ({ params, request, assets }): Promise<SuggestDashboardResponse> => {
    const assetsClient = await assets.getClientWithRequest({ request });

    const {
      path: { id: streamId },
      query: { query },
    } = params;

    const suggestions = (
      await assetsClient.getSuggestions({
        entityId: streamId,
        entityType: 'stream',
        assetType: 'dashboard',
        query,
      })
    ).map(({ asset: dashboard }) => ({
      dashboard,
    }));

    return {
      suggestions,
    };
  },
});

export const dashboardRoutes = {
  ...listDashboardsRoute,
  ...linkDashboardRoute,
  ...unlinkDashboardRoute,
  ...suggestDashboardsRoute,
};
