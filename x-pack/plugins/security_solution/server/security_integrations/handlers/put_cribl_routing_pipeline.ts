import type { ElasticsearchClient, Logger } from '@kbn/core/server';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { SECURITY_INTEGRATIONS_CRIBL_ROUTING_PIPELINE } from '../../../common/constants';
import { getRouteEntriesFromPolicyConfig } from '../../../common/security_integrations/cribl/translator';
import type { IngestPipelineRequest } from '../../../common/security_integrations/cribl/types';
import { buildPipelineRequest } from '../../lib/security_integrations/cribl/util/pipeline_builder';

export const putCriblRoutingPipeline = async (
  esClient: ElasticsearchClient,
  policy: NewPackagePolicy,
  logger: Logger
) => {
  const mappings = getRouteEntriesFromPolicyConfig(policy.vars);
  const pipelineConf = buildPipelineRequest(mappings);
  await createOrUpdatePipeline(esClient, pipelineConf, logger);
};

const createOrUpdatePipeline = async (
  esClient: ElasticsearchClient,
  pipelineConf: IngestPipelineRequest,
  logger: Logger
) => {
  try {
    await esClient.transport.request({
      method: 'PUT',
      path: `_ingest/pipeline/${SECURITY_INTEGRATIONS_CRIBL_ROUTING_PIPELINE}`,
      body: pipelineConf,
    });
    return true;
  } catch (e) {
    const error = transformError(e);
    logger.error(`Failed to put Cribl integration routing pipeline. error: ${error.message}`);
  }
  return false;
};
