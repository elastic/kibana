/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { ErrorCode } from '../../../../../../common/types/error_codes';
import { DeleteMlInferencePipelineResponse } from '../../../../../../common/types/pipelines';

import { getInferencePipelineNameFromIndexName } from '../../../../../utils/ml_inference_pipeline_utils';

import { detachMlInferencePipeline } from './detach_ml_inference_pipeline';

export const deleteMlInferencePipeline = async (
  indexName: string,
  pipelineName: string,
  client: ElasticsearchClient
) => {
  // Check if the pipeline is in use in a different index's managed pipeline
  const otherPipelineName = await findUsageInOtherManagedPipelines(pipelineName, indexName, client);
  if (otherPipelineName) {
    throw Object.assign(new Error(ErrorCode.PIPELINE_IS_IN_USE), {
      pipelineName: otherPipelineName,
    });
  }

  // Detach the pipeline first
  const response = await detachPipeline(indexName, pipelineName, client);

  // Finally, delete pipeline
  const deleteResponse = await client.ingest.deletePipeline({ id: pipelineName });
  if (deleteResponse.acknowledged === true) {
    response.deleted = pipelineName;
  }

  return response;
};

const detachPipeline = async (
  indexName: string,
  pipelineName: string,
  client: ElasticsearchClient
): Promise<DeleteMlInferencePipelineResponse> => {
  try {
    return await detachMlInferencePipeline(indexName, pipelineName, client);
  } catch (error) {
    // only suppress Not Found error
    if (error.meta?.statusCode !== 404) {
      throw error;
    }

    return {};
  }
};

const findUsageInOtherManagedPipelines = async (
  pipelineName: string,
  indexName: string,
  client: ElasticsearchClient
): Promise<string | undefined> => {
  try {
    // Fetch all managed parent ML pipelines
    const pipelines = await client.ingest.getPipeline({
      id: '*@ml-inference',
    });

    // The given inference pipeline is being used in another index's managed pipeline if:
    // - The index name is different from the one we're deleting from, AND
    // - Its processors contain at least one entry in which the supplied pipeline name is referenced
    return Object.entries(pipelines).find(
      ([name, pipeline]) =>
        name !== getInferencePipelineNameFromIndexName(indexName) &&
        pipeline.processors?.find((processor) => processor.pipeline?.name === pipelineName)
    )?.[0]; // Managed pipeline name
  } catch (error) {
    // only suppress Not Found error
    if (error.meta?.statusCode !== 404) {
      throw error;
    }
  }
};
