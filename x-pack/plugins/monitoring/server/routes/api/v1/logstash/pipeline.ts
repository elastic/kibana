/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { handleError, PipelineNotFoundError } from '../../../../lib/errors';
import {
  postLogstashPipelineRequestParamsRT,
  postLogstashPipelineRequestPayloadRT,
} from '../../../../../common/http_api/logstash/post_logstash_pipeline';
import { getPipelineVersions } from '../../../../lib/logstash/get_pipeline_versions';
import { getPipeline } from '../../../../lib/logstash/get_pipeline';
import { getPipelineVertex } from '../../../../lib/logstash/get_pipeline_vertex';
import { MonitoringCore, PipelineVersion } from '../../../../types';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';

function getPipelineVersion(versions: PipelineVersion[], pipelineHash: string | null) {
  return pipelineHash
    ? versions.find(({ hash }) => hash === pipelineHash) ?? versions[0]
    : versions[0];
}

export function logstashPipelineRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postLogstashPipelineRequestParamsRT);
  const validateBody = createValidationFunction(postLogstashPipelineRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/pipeline/{pipelineId}/{pipelineHash?}',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const config = server.config;
      const clusterUuid = req.params.clusterUuid;
      const detailVertexId = req.payload.detailVertexId;

      const pipelineId = req.params.pipelineId;
      // Optional params default to empty string, set to null to be more explicit.
      const pipelineHash = req.params.pipelineHash ?? null;

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

      const callGetPipelineVertexFunc = () => {
        if (!detailVertexId) {
          return Promise.resolve(undefined);
        }

        return getPipelineVertex(req, config, clusterUuid, pipelineId, version, detailVertexId);
      };

      try {
        const [pipeline, vertex] = await Promise.all([
          getPipeline(req, config, clusterUuid, pipelineId, version),
          callGetPipelineVertexFunc(),
        ]);
        return {
          versions,
          pipeline,
          vertex,
        };
      } catch (err) {
        if (err instanceof PipelineNotFoundError) {
          req.getLogger().error(err.message);
          throw notFound(err.message);
        }
        return handleError(err, req);
      }
    },
  });
}
