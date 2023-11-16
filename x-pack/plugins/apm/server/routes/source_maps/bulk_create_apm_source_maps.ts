/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Artifact } from '@kbn/fleet-plugin/server';
import { getUnzippedArtifactBody } from '../fleet/source_maps';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/apm_system_index_constants';
import { ApmSourceMap } from './create_apm_source_map_index_template';
import { getEncodedContent, getSourceMapId } from './sourcemap_utils';

export async function bulkCreateApmSourceMaps({
  artifacts,
  internalESClient,
}: {
  artifacts: Artifact[];
  internalESClient: ElasticsearchClient;
}) {
  const docs = await Promise.all(
    artifacts.map(async (artifact): Promise<ApmSourceMap> => {
      const { serviceName, serviceVersion, bundleFilepath, sourceMap } =
        await getUnzippedArtifactBody(artifact.body);

      const { contentEncoded, contentHash } = await getEncodedContent(
        sourceMap
      );

      return {
        fleet_id: artifact.id,
        created: artifact.created,
        content: contentEncoded,
        content_sha256: contentHash,
        file: {
          path: bundleFilepath,
        },
        service: {
          name: serviceName,
          version: serviceVersion,
        },
      };
    })
  );

  return internalESClient.bulk<ApmSourceMap>({
    body: docs.flatMap((doc) => {
      const id = getSourceMapId({
        serviceName: doc.service.name,
        serviceVersion: doc.service.version,
        bundleFilepath: doc.file.path,
      });
      return [{ create: { _index: APM_SOURCE_MAP_INDEX, _id: id } }, doc];
    }),
  });
}
