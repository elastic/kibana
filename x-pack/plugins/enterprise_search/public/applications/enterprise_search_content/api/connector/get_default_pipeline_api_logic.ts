/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipelineParams } from '../../../../../common/types/connectors';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type FetchDefaultPipelineResponse = IngestPipelineParams;

export const getDefaultPipeline = async (): Promise<FetchDefaultPipelineResponse> => {
  const route = '/internal/enterprise_search/connectors/default_pipeline';

  return await HttpLogic.values.http.get(route);
};

export const FetchDefaultPipelineApiLogic = createApiLogic(
  ['content', 'get_default_pipeline_api_logic'],
  getDefaultPipeline
);
