/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Artifact } from '@kbn/fleet-plugin/server';
import { getUnzippedArtifactBody } from '../fleet/source_maps';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/get_apm_indices';
import { ApmSourceMapDoc } from './create_apm_source_map_doc';
import { getEncodedContent, getSourceMapId } from './sourcemap_utils';

export async function bulkCreateApmSourceMapDocs({
  artifacts,
  internalESClient,
}: {
  artifacts: Artifact[];
  internalESClient: ElasticsearchClient;
}) {
  const docs = await Promise.all(
    artifacts.map(async (artifact): Promise<ApmSourceMapDoc> => {
      const { serviceName, serviceVersion, bundleFilepath, sourceMap } =
        await getUnzippedArtifactBody(artifact.body);

      const { contentEncoded, contentHash } = await getEncodedContent(
        sourceMap
      );

      return {
        created: artifact.created,
        content: contentEncoded,
        content_sha256: contentHash,
        'file.path': bundleFilepath,
        'service.name': serviceName,
        'service.version': serviceVersion,
      };
    })
  );

  return internalESClient.bulk<ApmSourceMapDoc>({
    body: docs.flatMap((doc) => {
      const id = getSourceMapId({
        serviceName: doc['service.name'],
        serviceVersion: doc['service.version'],
        bundleFilepath: doc['file.path'],
      });
      return [{ create: { _index: APM_SOURCE_MAP_INDEX, _id: id } }, doc];
    }),
  });
}
