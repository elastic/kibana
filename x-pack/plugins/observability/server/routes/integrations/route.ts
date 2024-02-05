/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferSearchResponseOf } from '@kbn/es-types';
import * as t from 'io-ts';
import {
  AssetSummary,
  IntegrationSummary,
  ObsIntegrationMetadata,
} from '../../../common/integrations';
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

    const integrations: IntegrationSummary[] = installedPackages.map((pkg) => {
      const metadata = metadataList.find((item) => item.integration_name === pkg.name);
      const assets = metadata!.assets.map<AssetSummary>((asset) => ({
        display_name: asset.display_name,
        name: asset.display_name.replaceAll(' ', '_').toLowerCase(),
      }));

      return {
        name: metadata!.integration_name,
        display_name: metadata!.display_name,
        assets,
      };
    });

    return { integrations };
  },
});

const getIntegrationRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/integrations/{integrationName} 2023-10-31',
  options: {
    tags: [],
  },
  params: t.type({
    path: t.type({
      integrationName: t.string,
    }),
  }),
  handler: async ({ context, dependencies, request, params }) => {
    const { integrationName } = params.path;

    const spaceId = dependencies.spaces?.spacesService.getSpaceId(request);

    const soClient = (await context.core).savedObjects.getClient({
      includedHiddenTypes: [OBS_INTEGRATION_METADATA_SO_TYPE],
    });
    const metadata = await soClient.get<ObsIntegrationMetadata>(
      OBS_INTEGRATION_METADATA_SO_TYPE,
      `obs_integration_metadata:${integrationName}`
    );

    if (!metadata) {
      throw new Error(`Could not find metadata for the ${integrationName} integration.`);
    }

    const packageService = dependencies.fleet.packageService.asScoped(request);
    const packages = await packageService.getPackages();
    const thePackage = packages.find(
      (pkg) =>
        pkg.status === 'installed' &&
        pkg.savedObject?.attributes.installed_kibana_space_id === spaceId &&
        pkg.name === integrationName
    );

    if (!thePackage) {
      throw new Error(`Could not find package info for the ${integrationName} integration.`);
    }

    const packageInfo = await packageService.getPackage(thePackage.name, thePackage.version);

    return {
      integration: {
        package: {
          icons: packageInfo.packageInfo.icons,
          data_streams: packageInfo.packageInfo.data_streams,
        },
        metadata: metadata.attributes,
      },
    };
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
        // Either both string or both number?
        from: t.union([t.string, t.number]),
        to: t.union([t.string, t.number]),
      }),
      t.partial({
        displayNameField: t.string,
        filter: t.string,
      }),
    ]),
  }),
  handler: async ({ context, params }) => {
    const { indexPattern, identifierField, displayNameField, from, to, filter } = params.query;
    const core = await context.core;

    const searchParams = {
      index: indexPattern,
      size: 0,
      query: {
        bool: {
          must: [
            {
              range: {
                '@timestamp': {
                  gte: from,
                  lte: to,
                },
              },
            },
          ],
          ...(filter
            ? {
                minimum_should_match: 1,
                should: [
                  {
                    wildcard: {
                      [identifierField]: {
                        value: `*${filter}*`,
                      },
                    },
                  },
                  displayNameField
                    ? {
                        wildcard: {
                          [displayNameField]: {
                            value: `*${filter}*`,
                          },
                        },
                      }
                    : null,
                ].filter((should) => should !== null),
              }
            : {}),
        },
      },
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
  ...getIntegrationRoute,
  ...getResolveAssetsRoute,
};
