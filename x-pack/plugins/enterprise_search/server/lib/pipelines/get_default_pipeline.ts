/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CURRENT_CONNECTORS_INDEX } from '../..';
import { DEFAULT_PIPELINE_VALUES } from '../../../common/constants';

import { IngestPipelineParams } from '../../../common/types/connectors';
import { DefaultConnectorsPipelineMeta } from '../../index_management/setup_indices';

export const getDefaultPipeline = async (
  client: IScopedClusterClient
): Promise<IngestPipelineParams> => {
  const mapping = await client.asCurrentUser.indices.getMapping({
    index: CURRENT_CONNECTORS_INDEX,
  });
  const meta: DefaultConnectorsPipelineMeta | undefined =
    mapping[CURRENT_CONNECTORS_INDEX]?.mappings._meta?.pipeline;
  const mappedMapping: IngestPipelineParams = meta
    ? {
        extract_binary_content: meta.default_extract_binary_content,
        name: meta.default_name,
        reduce_whitespace: meta.default_reduce_whitespace,
        run_ml_inference: meta.default_run_ml_inference,
      }
    : DEFAULT_PIPELINE_VALUES;
  return mappedMapping;
};
