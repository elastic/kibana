/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { handleError } from '../../../../lib/errors';
import { getPipelineVersions } from '../../../../lib/logstash/get_pipeline_versions';
import { getPipeline } from '../../../../lib/logstash/get_pipeline';
import { getPipelineVertex } from '../../../../lib/logstash/get_pipeline_vertex';

function getPipelineVersion(versions, pipelineHash) {
  return pipelineHash ? versions.find(({ hash }) => hash === pipelineHash) : versions[0];
}

/*
 * Logstash Pipeline route.
 */
export function logstashPipelineRoute(server) {
  /**
   * Logstash Pipeline Viewer request.
   *
   * This will fetch all data required to display a Logstash Pipeline Viewer page.
   *
   * The current details returned are:
   *
   * - Pipeline Metrics
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/pipeline/{pipelineId}/{pipelineHash?}',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          pipelineId: schema.string(),
          pipelineHash: schema.maybe(schema.string()),
        }),
        body: schema.object({
          ccs: schema.maybe(schema.string()),
          detailVertexId: schema.maybe(schema.string()),
        }),
      },
    },
    handler: async (req) => {
      const config = server.config;
      const clusterUuid = req.params.clusterUuid;
      const detailVertexId = req.payload.detailVertexId;

      const pipelineId = req.params.pipelineId;
      // Optional params default to empty string, set to null to be more explicit.
      const pipelineHash = req.params.pipelineHash || null;

      // Figure out which version of the pipeline we want to show
      let versions;
      try {
        versions = await getPipelineVersions({
          req,
          clusterUuid,
          pipelineId,
        });
      } catch (err) {
        return handleError(err, req);
      }
      const version = getPipelineVersion(versions, pipelineHash);

      // noinspection ES6MissingAwait
      const promises = [getPipeline(req, config, clusterUuid, pipelineId, version)];
      if (detailVertexId) {
        promises.push(
          getPipelineVertex(req, config, clusterUuid, pipelineId, version, detailVertexId)
        );
      }

      try {
        const [pipeline, vertex] = await Promise.all(promises);
        return {
          versions,
          pipeline,
          vertex,
        };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
