/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import Boom from 'boom';
import { get } from 'lodash';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import {
  InfraMetadataFeature,
  InfraMetadataRequestRT,
  InfraMetadataRT,
} from '../../../common/http_api/metadata_api';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getMetricMetadata } from './lib/get_metric_metadata';
import { pickFeatureName } from './lib/pick_feature_name';
import { getCloudMetricsMetadata } from './lib/get_cloud_metric_metadata';
import { getNodeInfo } from './lib/get_node_info';
import { throwErrors } from '../../../common/runtime_types';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initMetadataRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/metadata',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      try {
        const { nodeId, nodeType, sourceId, timeRange } = pipe(
          InfraMetadataRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { configuration } = await libs.sources.getSourceConfiguration(
          requestContext.core.savedObjects.client,
          sourceId
        );
        const metricsMetadata = await getMetricMetadata(
          framework,
          requestContext,
          configuration,
          nodeId,
          nodeType,
          timeRange
        );
        const metricFeatures = pickFeatureName(metricsMetadata.buckets).map(
          nameToFeature('metrics')
        );

        const info = await getNodeInfo(framework, requestContext, configuration, nodeId, nodeType);
        const cloudInstanceId = get(info, 'cloud.instance.id');

        const cloudMetricsMetadata = cloudInstanceId
          ? await getCloudMetricsMetadata(
              framework,
              requestContext,
              configuration,
              cloudInstanceId,
              timeRange
            )
          : { buckets: [] };
        const cloudMetricsFeatures = pickFeatureName(cloudMetricsMetadata.buckets).map(
          nameToFeature('metrics')
        );
        const id = metricsMetadata.id;
        const name = metricsMetadata.name || id;
        return response.ok({
          body: InfraMetadataRT.encode({
            id,
            name,
            features: [...metricFeatures, ...cloudMetricsFeatures],
            info,
          }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};

const nameToFeature = (source: string) => (name: string): InfraMetadataFeature => ({
  name,
  source,
});
