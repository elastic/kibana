/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { Pipeline, RawSamples } from '../model/common_attributes';
import { CheckPipelineAPIResponse } from '../model/response_schemas';

export type CheckPipelineRequestBody = z.infer<typeof CheckPipelineRequestBody>;
export const CheckPipelineRequestBody = z.object({
  rawSamples: RawSamples,
  pipeline: Pipeline,
});
export type CheckPipelineRequestBodyInput = z.input<typeof CheckPipelineRequestBody>;

export type CheckPipelineResponse = z.infer<typeof CheckPipelineResponse>;
export const CheckPipelineResponse = CheckPipelineAPIResponse;
