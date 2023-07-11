/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { IngestPipelineParams } from '../../../../../common/types/connectors';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface PostPipelineArgs {
  connectorId: string;
  pipeline: IngestPipelineParams;
}

export interface PostPipelineResponse {
  connectorId: string;
  pipeline: IngestPipelineParams;
}

export const updatePipeline = async ({
  connectorId,
  pipeline,
}: PostPipelineArgs): Promise<PostPipelineResponse> => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/pipeline`;

  await HttpLogic.values.http.put(route, {
    body: JSON.stringify(pipeline),
  });
  return { connectorId, pipeline };
};

export const UpdatePipelineApiLogic = createApiLogic(
  ['content', 'update_pipeline_api_logic'],
  updatePipeline,
  {
    showSuccessFlashFn: () =>
      i18n.translate('xpack.enterpriseSearch.content.indices.pipelines.successToast.title', {
        defaultMessage: 'Pipelines updated',
      }),
  }
);
