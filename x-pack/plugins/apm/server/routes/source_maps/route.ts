/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { SavedObjectsClientContract } from 'kibana/server';
import { jsonRt } from '@kbn/io-ts-utils';
import {
  createApmArtifact,
  deleteApmArtifact,
  listArtifacts,
  updateSourceMapsOnFleetPolicies,
  getCleanedBundleFilePath,
  ArtifactSourceMap,
} from '../fleet/source_maps';
import { getInternalSavedObjectsClient } from '../../lib/helpers/get_internal_saved_objects_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { stringFromBufferRt } from '../../utils/string_from_buffer_rt';
import { Artifact } from '../../../../fleet/server';

export const sourceMapRt = t.intersection([
  t.type({
    version: t.number,
    sources: t.array(t.string),
    mappings: t.string,
  }),
  t.partial({
    names: t.array(t.string),
    file: t.string,
    sourceRoot: t.string,
    sourcesContent: t.array(t.string),
  }),
]);

export type SourceMap = t.TypeOf<typeof sourceMapRt>;

const listSourceMapRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/sourcemaps',
  options: { tags: ['access:apm'] },
  async handler({
    plugins,
  }): Promise<{ artifacts: ArtifactSourceMap[] } | undefined> {
    try {
      const fleetPluginStart = await plugins.fleet?.start();
      if (fleetPluginStart) {
        const artifacts = await listArtifacts({ fleetPluginStart });
        return { artifacts };
      }
    } catch (e) {
      throw Boom.internal(
        'Something went wrong while fetching artifacts source maps',
        e
      );
    }
  },
});

const uploadSourceMapRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/sourcemaps',
  options: {
    tags: ['access:apm', 'access:apm_write'],
    body: { accepts: ['multipart/form-data'] },
  },
  params: t.type({
    body: t.type({
      service_name: t.string,
      service_version: t.string,
      bundle_filepath: t.string,
      sourcemap: t
        .union([t.string, stringFromBufferRt])
        .pipe(jsonRt)
        .pipe(sourceMapRt),
    }),
  }),
  handler: async ({ params, plugins, core }): Promise<Artifact | undefined> => {
    const {
      service_name: serviceName,
      service_version: serviceVersion,
      bundle_filepath: bundleFilepath,
      sourcemap: sourceMap,
    } = params.body;
    const cleanedBundleFilepath = getCleanedBundleFilePath(bundleFilepath);
    const fleetPluginStart = await plugins.fleet?.start();
    const coreStart = await core.start();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const savedObjectsClient = await getInternalSavedObjectsClient(core.setup);
    try {
      if (fleetPluginStart) {
        const artifact = await createApmArtifact({
          fleetPluginStart,
          apmArtifactBody: {
            serviceName,
            serviceVersion,
            bundleFilepath: cleanedBundleFilepath,
            sourceMap,
          },
        });
        await updateSourceMapsOnFleetPolicies({
          core,
          fleetPluginStart,
          savedObjectsClient:
            savedObjectsClient as unknown as SavedObjectsClientContract,
          elasticsearchClient: esClient,
        });

        return artifact;
      }
    } catch (e) {
      throw Boom.internal(
        'Something went wrong while creating a new source map',
        e
      );
    }
  },
});

const deleteSourceMapRoute = createApmServerRoute({
  endpoint: 'DELETE /api/apm/sourcemaps/{id}',
  options: { tags: ['access:apm', 'access:apm_write'] },
  params: t.type({
    path: t.type({
      id: t.string,
    }),
  }),
  handler: async ({ params, plugins, core }): Promise<void> => {
    const fleetPluginStart = await plugins.fleet?.start();
    const { id } = params.path;
    const coreStart = await core.start();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const savedObjectsClient = await getInternalSavedObjectsClient(core.setup);
    try {
      if (fleetPluginStart) {
        await deleteApmArtifact({ id, fleetPluginStart });
        await updateSourceMapsOnFleetPolicies({
          core,
          fleetPluginStart,
          savedObjectsClient:
            savedObjectsClient as unknown as SavedObjectsClientContract,
          elasticsearchClient: esClient,
        });
      }
    } catch (e) {
      throw Boom.internal(
        `Something went wrong while deleting source map. id: ${id}`,
        e
      );
    }
  },
});

export const sourceMapsRouteRepository = {
  ...listSourceMapRoute,
  ...uploadSourceMapRoute,
  ...deleteSourceMapRoute,
};
