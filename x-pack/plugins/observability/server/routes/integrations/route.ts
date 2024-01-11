/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferSearchResponseOf } from '@kbn/es-types';
import * as t from 'io-ts';
import { ObsIntegrationMetadata } from '../../../common/integrations';
import { OBS_INTEGRATION_METADATA_SO_TYPE } from '../../lib/integrations';
import { createObservabilityServerRoute } from '../create_observability_server_route';

const getInstalledIntegrationsRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/integrations/installed 2023-10-31',
  options: {
    tags: [],
  },
  handler: async ({ context, dependencies, request }) => {
    const spaceId = dependencies.spaces?.spacesService.getSpaceId(request);

    const soClient = (await context.core).savedObjects.getClient({
      includedHiddenTypes: [OBS_INTEGRATION_METADATA_SO_TYPE],
    });
    // Should be paginated to fetch all
    const metadataList = (
      await soClient.find<ObsIntegrationMetadata>({
        type: OBS_INTEGRATION_METADATA_SO_TYPE,
      })
    ).saved_objects.map((so) => so.attributes);

    const integrationsWithMetadata = metadataList.map((metadata) => metadata.integration_name);
    const packageService = dependencies.fleet.packageService.asScoped(request);
    const packages = await packageService.getPackages();
    const installedPackages = packages.filter(
      (pkg) =>
        pkg.status === 'installed' &&
        pkg.savedObject?.attributes.installed_kibana_space_id === spaceId &&
        integrationsWithMetadata.includes(pkg.name)
    );
    const packagesInfo = await Promise.all(
      installedPackages.map((pkg) => packageService.getPackage(pkg.name, pkg.version))
    );

    const integrations = packagesInfo
      .map((pkg) => {
        const metadata = metadataList.find(
          (item) => item.integration_name === pkg.packageInfo.name
        );
        return {
          package: {
            icons: pkg.packageInfo.icons,
            data_streams: pkg.packageInfo.data_streams,
          },
          metadata,
        };
      })
      .filter((integration) => integration.metadata !== undefined);

    return { integrations };
  },
});

const getResolveAssetsRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/integrations/resolve_assets 2023-10-31',
  options: {
    tags: [],
  },
  params: t.type({
    query: t.intersection([
      t.type({
        indexPattern: t.string,
        identifierField: t.string,
      }),
      t.partial({
        displayNameField: t.string,
      }),
    ]),
  }),
  handler: async ({ context, params }) => {
    const { indexPattern, identifierField, displayNameField } = params.query;
    const core = await context.core;

    const searchParams = {
      index: indexPattern,
      size: 0,
      aggs: {
        assets: {
          terms: {
            field: identifierField,
            size: 20, // Needs pagination
          },
          ...(displayNameField
            ? {
                aggs: {
                  display_name: {
                    terms: {
                      field: displayNameField,
                      size: 1,
                    },
                  },
                },
              }
            : {}),
        },
      },
    } as const;

    const response = (await core.elasticsearch.client.asCurrentUser.search(
      searchParams
    )) as unknown as InferSearchResponseOf<any, typeof searchParams>;

    if (!response.aggregations) {
      return { assets: [] };
    }

    const assets = response.aggregations.assets.buckets.map((assetBucket) => ({
      id: assetBucket.key as string,
      display_name: displayNameField
        ? assetBucket.display_name.buckets[0]
          ? (assetBucket.display_name.buckets[0].key as string)
          : undefined
        : undefined,
    }));

    return { assets };
  },
});

export const integrationsRouteRepository = {
  ...getInstalledIntegrationsRoute,
  ...getResolveAssetsRoute,
};
