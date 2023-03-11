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

export type PostDefaultPipelineResponse = IngestPipelineParams;
export type PostDefaultPipelineArgs = IngestPipelineParams;

export const updateDefaultPipeline = async (
  pipeline: IngestPipelineParams
): Promise<PostDefaultPipelineResponse> => {
  const route = '/internal/enterprise_search/connectors/default_pipeline';

  await HttpLogic.values.http.put(route, { body: JSON.stringify(pipeline) });

  return pipeline;
};

export const UpdateDefaultPipelineApiLogic = createApiLogic(
  ['content', 'update_default_pipeline_api_logic'],
  updateDefaultPipeline,
  {
    showSuccessFlashFn: () =>
      i18n.translate('xpack.enterpriseSearch.content.indices.defaultPipelines.successToast.title', {
        defaultMessage: 'Default pipeline successfully updated',
      }),
  }
);
