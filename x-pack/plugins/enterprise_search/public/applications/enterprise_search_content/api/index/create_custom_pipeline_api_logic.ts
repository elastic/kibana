/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface CreateCustomPipelineApiLogicArgs {
  indexName: string;
}

export interface CreateCustomPipelineApiLogicResponse {
  created: string[];
}

export const createCustomPipeline = async ({
  indexName,
}: CreateCustomPipelineApiLogicArgs): Promise<CreateCustomPipelineApiLogicResponse> => {
  const route = `/internal/enterprise_search/indices/${indexName}/pipelines`;
  const result = await HttpLogic.values.http.post<CreateCustomPipelineApiLogicResponse>(route);
  return result;
};

export const CreateCustomPipelineApiLogic = createApiLogic(
  ['content', 'create_custom_pipeline_api_logic'],
  createCustomPipeline,
  {
    showSuccessFlashFn: () =>
      i18n.translate('xpack.enterpriseSearch.content.indices.pipelines.successToastCustom.title', {
        defaultMessage: 'Custom pipeline created',
      }),
  }
);
