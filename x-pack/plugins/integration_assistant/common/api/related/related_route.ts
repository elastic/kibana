/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import {
  Connector,
  DataStreamName,
  LangSmithOptions,
  PackageName,
  Pipeline,
  RawSamples,
} from '../model/common_attributes';
import { RelatedAPIResponse } from '../model/response_schemas';

export type RelatedRequestBody = z.infer<typeof RelatedRequestBody>;
export const RelatedRequestBody = z.object({
  packageName: PackageName,
  dataStreamName: DataStreamName,
  rawSamples: RawSamples,
  currentPipeline: Pipeline,
  connectorId: Connector,
  langSmithOptions: LangSmithOptions.optional(),
});
export type RelatedRequestBodyInput = z.input<typeof RelatedRequestBody>;

export type RelatedResponse = z.infer<typeof RelatedResponse>;
export const RelatedResponse = RelatedAPIResponse;
