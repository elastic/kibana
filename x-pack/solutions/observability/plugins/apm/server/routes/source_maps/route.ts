/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import {
  routeDefinitions,
  sourceMapSchema,
  type ListSourceMapArtifactsResponse,
} from '@kbn/apm-api-shared';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Artifact } from '@kbn/fleet-plugin/server';
import { z } from '@kbn/zod/v4';
import type { ApmFeatureFlags } from '../../../common/apm_feature_flags';
import { getInternalSavedObjectsClient } from '../../lib/helpers/get_internal_saved_objects_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  createFleetSourceMapArtifact,
  deleteFleetSourcemapArtifact,
  getCleanedBundleFilePath,
  listSourceMapArtifacts,
  updateSourceMapsOnFleetPolicies,
} from '../fleet/source_maps';
import { createApmSourceMap } from './create_apm_source_map';
import { deleteApmSourceMap } from './delete_apm_sourcemap';
import { runFleetSourcemapArtifactsMigration } from './schedule_source_map_migration';

function throwNotImplementedIfSourceMapNotAvailable(featureFlags: ApmFeatureFlags): void {
  if (!featureFlags.sourcemapApiAvailable) {
    throw Boom.notImplemented();
  }
}

const listSourceMapRoute = createApmServerRoute({
  endpoint: routeDefinitions.sourceMaps.list.endpoint,
  params: routeDefinitions.sourceMaps.list.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  async handler({
    params,
    plugins,
    featureFlags,
  }): Promise<ListSourceMapArtifactsResponse | undefined> {
    throwNotImplementedIfSourceMapNotAvailable(featureFlags);

    const { page, perPage } = params.query;

    try {
      const fleetPluginStart = await plugins.fleet?.start();
      if (fleetPluginStart) {
        const { artifacts, total } = await listSourceMapArtifacts({
          fleetPluginStart,
          page,
          perPage,
        });

        return { artifacts, total };
      }
    } catch (e) {
      throw Boom.internal('Something went wrong while fetching artifacts source maps', e);
    }
  },
});

const MAX_LENGTH_1024 = 1024;
export const uploadSourceMapParams = z.object({
  body: z.object({
    service_name: z.string().max(MAX_LENGTH_1024),
    service_version: z.string().max(MAX_LENGTH_1024),
    bundle_filepath: z.string().max(MAX_LENGTH_1024),
    sourcemap: z
      .union([z.string(), z.instanceof(Buffer).transform((buf): string => buf.toString('utf-8'))])
      .pipe(
        z.string().transform((value, ctx): unknown => {
          try {
            return JSON.parse(value);
          } catch (err) {
            ctx.addIssue({ code: 'custom', message: err.message });
            return z.NEVER;
          }
        })
      )
      .pipe(sourceMapSchema),
  }),
});
// Can not migrate to apm-api-shared, it depends on Fleet
const uploadSourceMapRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/sourcemaps 2023-10-31',
  params: uploadSourceMapParams,
  options: {
    body: { accepts: ['multipart/form-data'] },
  },
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_write'],
    },
  },
  handler: async ({
    params,
    plugins,
    core,
    logger,
    featureFlags,
  }): Promise<Artifact | undefined> => {
    throwNotImplementedIfSourceMapNotAvailable(featureFlags);

    const {
      service_name: serviceName,
      service_version: serviceVersion,
      bundle_filepath: bundleFilepath,
      sourcemap: sourceMapContent,
    } = params.body;
    const cleanedBundleFilepath = getCleanedBundleFilePath(bundleFilepath);
    const fleetPluginStart = await plugins.fleet?.start();
    const coreStart = await core.start();
    const internalESClient = coreStart.elasticsearch.client.asInternalUser;
    const savedObjectsClient = await getInternalSavedObjectsClient(coreStart);
    try {
      if (fleetPluginStart) {
        // create source map as fleet artifact
        const artifact = await createFleetSourceMapArtifact({
          fleetPluginStart,
          apmArtifactBody: {
            serviceName,
            serviceVersion,
            bundleFilepath: cleanedBundleFilepath,
            sourceMap: sourceMapContent,
          },
        });

        // sync source map to APM managed index
        await createApmSourceMap({
          internalESClient,
          logger,
          fleetId: artifact.id,
          created: artifact.created,
          sourceMapContent,
          bundleFilepath: cleanedBundleFilepath,
          serviceName,
          serviceVersion,
        });

        // sync source map to fleet policy
        await updateSourceMapsOnFleetPolicies({
          coreStart,
          fleetPluginStart,
          savedObjectsClient: savedObjectsClient as unknown as SavedObjectsClientContract,
          internalESClient,
        });

        return artifact;
      }
    } catch (e) {
      throw Boom.internal('Something went wrong while creating a new source map', e);
    }
  },
});

const deleteSourceMapRoute = createApmServerRoute({
  endpoint: routeDefinitions.sourceMaps.delete.endpoint,
  params: routeDefinitions.sourceMaps.delete.params,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_write'],
    },
  },
  handler: async ({ params, plugins, core, featureFlags }): Promise<void> => {
    throwNotImplementedIfSourceMapNotAvailable(featureFlags);

    const fleetPluginStart = await plugins.fleet?.start();
    const { id } = params.path;
    const coreStart = await core.start();
    const internalESClient = coreStart.elasticsearch.client.asInternalUser;
    const savedObjectsClient = await getInternalSavedObjectsClient(coreStart);
    try {
      if (fleetPluginStart) {
        await deleteFleetSourcemapArtifact({ id, fleetPluginStart });
        await deleteApmSourceMap({ internalESClient, fleetId: id });
        await updateSourceMapsOnFleetPolicies({
          coreStart,
          fleetPluginStart,
          savedObjectsClient: savedObjectsClient as unknown as SavedObjectsClientContract,
          internalESClient,
        });
      }
    } catch (e) {
      throw Boom.internal(`Something went wrong while deleting source map. id: ${id}`, e);
    }
  },
});

const migrateFleetArtifactsSourceMapRoute = createApmServerRoute({
  endpoint: routeDefinitions.sourceMaps.migrateFleetArtifacts.endpoint,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_write'],
    },
  },
  handler: async ({ plugins, core, logger, featureFlags }): Promise<void> => {
    throwNotImplementedIfSourceMapNotAvailable(featureFlags);

    const fleet = await plugins.fleet?.start();
    const coreStart = await core.start();
    const internalESClient = coreStart.elasticsearch.client.asInternalUser;

    if (fleet) {
      return runFleetSourcemapArtifactsMigration({
        fleet,
        internalESClient,
        logger,
      });
    }
  },
});

export const sourceMapsRouteRepository = {
  ...listSourceMapRoute,
  ...uploadSourceMapRoute,
  ...deleteSourceMapRoute,
  ...migrateFleetArtifactsSourceMapRoute,
};
