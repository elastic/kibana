/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CURRENT_CONNECTORS_INDEX } from '../..';

import { IngestPipelineParams } from '../../../common/types/connectors';
import {
  DefaultConnectorsPipelineMeta,
  setupConnectorsIndices,
} from '../../index_management/setup_indices';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

export const updateDefaultPipeline = async (
  client: IScopedClusterClient,
  pipeline: IngestPipelineParams
) => {
  try {
    const mapping = await client.asCurrentUser.indices.getMapping({
      index: CURRENT_CONNECTORS_INDEX,
    });
    const newPipeline: DefaultConnectorsPipelineMeta = {
      default_extract_binary_content: pipeline.extract_binary_content,
      default_name: pipeline.name,
      default_reduce_whitespace: pipeline.reduce_whitespace,
      default_run_ml_inference: pipeline.run_ml_inference,
    };
    await client.asCurrentUser.indices.putMapping({
      _meta: { ...mapping[CURRENT_CONNECTORS_INDEX].mappings._meta, pipeline: newPipeline },
      index: CURRENT_CONNECTORS_INDEX,
    });
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      setupConnectorsIndices(client.asCurrentUser);
    }
  }
};
