/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { SavedObjectsClientContract } from 'kibana/server';
import {
  createApmArtifact,
  deleteApmArtifact,
  listArtifacts,
  updateSourceMapsOnFleetPolicies,
} from '../lib/fleet/source_maps';
import { getInternalSavedObjectsClient } from '../lib/helpers/get_internal_saved_objects_client';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';

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

const listSourceMapRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/sourcemaps',
  options: { tags: ['access:apm'] },
  handler: async ({ plugins, logger }) => {
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
  endpoint: 'POST /api/apm/sourcemaps/{serviceName}/{serviceVersion}',
  options: { tags: ['access:apm', 'access:apm_write'] },
  params: t.type({
    path: t.type({
      serviceName: t.string,
      serviceVersion: t.string,
    }),
    body: t.type({
      bundleFilepath: t.string,
      sourceMap: sourceMapRt,
    }),
  }),
  handler: async ({ params, plugins, core }) => {
    const { serviceName, serviceVersion } = params.path;
    const { bundleFilepath, sourceMap } = params.body;
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
            bundleFilepath,
            sourceMap,
          },
        });
        await updateSourceMapsOnFleetPolicies({
          core,
          fleetPluginStart,
          savedObjectsClient: (savedObjectsClient as unknown) as SavedObjectsClientContract,
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
  handler: async ({ context, params, plugins, core }) => {
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
          savedObjectsClient: (savedObjectsClient as unknown) as SavedObjectsClientContract,
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

export const sourceMapsRouteRepository = createApmServerRouteRepository()
  .add(listSourceMapRoute)
  .add(uploadSourceMapRoute)
  .add(deleteSourceMapRoute);
