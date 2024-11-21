/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ASSET_TYPES, Asset } from '../../../common/assets';
import { createServerRoute } from '../create_server_route';

interface ListAssetsResponse {
  assets: Asset[];
}

interface LinkAssetResponse {
  acknowledged: boolean;
}

interface UnlinkAssetResponse {
  acknowledged: boolean;
}

const assetTypeSchema = z.union([
  z.literal(ASSET_TYPES.Dashboard),
  z.literal(ASSET_TYPES.Rule),
  z.literal(ASSET_TYPES.Slo),
]);

export const listAssetsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}/assets',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
  }),
  async handler({ params, request, assets }): Promise<ListAssetsResponse> {
    const assetsClient = await assets.getClientWithRequest({ request });

    const {
      path: { id: streamId },
    } = params;

    return {
      assets: await assetsClient.getAssets({
        entityId: streamId,
        entityType: 'stream',
      }),
    };
  },
});

export const linkAssetRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{id}/assets/{type}/{assetId}',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      type: assetTypeSchema,
      id: z.string(),
      assetId: z.string(),
    }),
  }),
  handler: async ({ params, request, assets }): Promise<LinkAssetResponse> => {
    const assetsClient = await assets.getClientWithRequest({ request });

    const {
      path: { assetId, id: streamId, type: assetType },
    } = params;

    await assetsClient.linkAsset({
      entityId: streamId,
      entityType: 'stream',
      assetId,
      assetType,
    });

    return {
      acknowledged: true,
    };
  },
});

export const unlinkAssetRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{id}/assets/{type}/{assetId}',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      type: assetTypeSchema,
      id: z.string(),
      assetId: z.string(),
    }),
  }),
  handler: async ({ params, request, assets }): Promise<UnlinkAssetResponse> => {
    const assetsClient = await assets.getClientWithRequest({ request });

    const {
      path: { assetId, id: streamId, type: assetType },
    } = params;

    await assetsClient.unlinkAsset({
      entityId: streamId,
      entityType: 'stream',
      assetId,
      assetType,
    });

    return {
      acknowledged: true,
    };
  },
});

export const assetsRoutes = {
  ...listAssetsRoute,
  ...linkAssetRoute,
  ...unlinkAssetRoute,
};
