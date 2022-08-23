/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { jsonRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { APM_EXPERIMENTAL_FEATURES_TYPE } from '../../../../common/apm_saved_object_constants';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';

const experimentalFeaturesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/settings/experimental_feature',
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    experimentalFeatures: Array<{
      savedObjectId: string;
      enableExperimentalFeatures?: boolean;
      experimentalFeatures?: string[];
    }>;
  }> => {
    const { context } = resources;
    const {
      savedObjects: { client: savedObjectsClient },
    } = await context.core;

    const result = await savedObjectsClient.find<{
      enableExperimentalFeatures?: boolean;
      experimentalFeatures?: string[];
    }>({
      type: APM_EXPERIMENTAL_FEATURES_TYPE,
    });

    return {
      experimentalFeatures: result.saved_objects.map(
        (
          savedObject
        ): {
          savedObjectId: string;
          enableExperimentalFeatures?: boolean;
          experimentalFeatures?: string[];
        } => {
          return {
            savedObjectId: savedObject?.id,
            enableExperimentalFeatures:
              savedObject?.attributes?.enableExperimentalFeatures || false,
            experimentalFeatures:
              savedObject?.attributes?.experimentalFeatures || [],
          };
        }
      ),
    };
  },
});

const saveExperimentalFeaturesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/settings/experimental_feature',
  params: t.type({
    body: t.intersection([
      t.partial({ savedObjectId: t.string }),
      t.type({
        enableExperimentalFeatures: t.boolean,
        experimentalFeatures: jsonRt.pipe(t.array(t.string)),
      }),
    ]),
  }),
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (
    resources
  ): Promise<{
    savedObjectId: string;
    enableExperimentalFeatures?: boolean;
    experimentalFeatures?: string[];
  }> => {
    const {
      context,
      params: { body },
    } = resources;
    const {
      savedObjects: { client: savedObjectsClient },
    } = await context.core;

    const { savedObjectId, ...experimentalFeaturesObject } = body;

    const savedObject = savedObjectId
      ? await savedObjectsClient.update(
          APM_EXPERIMENTAL_FEATURES_TYPE,
          savedObjectId,
          experimentalFeaturesObject
        )
      : await savedObjectsClient.create(
          APM_EXPERIMENTAL_FEATURES_TYPE,
          experimentalFeaturesObject
        );
    return {
      savedObjectId: savedObject.id,
      ...savedObject.attributes,
    };
  },
});

export const experimentalFeaturesRouteRepository = {
  ...experimentalFeaturesRoute,
  ...saveExperimentalFeaturesRoute,
};
