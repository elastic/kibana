/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import {
  Connector,
  DatastreamName,
  PackageName,
  Pipeline,
  RawSamples,
} from '../model/common_attributes';
import { CategorizationAPIResponse } from '../model/response_schemas';

export type CategorizationRequestBody = z.infer<typeof CategorizationRequestBody>;
export const CategorizationRequestBody = z.object({
  packageName: PackageName,
  datastreamName: DatastreamName,
  rawSamples: RawSamples,
  currentPipeline: Pipeline,
  connectorId: Connector,
});
export type CategorizationRequestBodyInput = z.input<typeof CategorizationRequestBody>;

export type CategorizationResponse = z.infer<typeof CategorizationResponse>;
export const CategorizationResponse = CategorizationAPIResponse;
