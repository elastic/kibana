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
  Mapping,
  PackageName,
  RawSamples,
} from '../model/common_attributes';
import { EcsMappingAPIResponse } from '../model/response_schemas';

export type EcsMappingRequestBody = z.infer<typeof EcsMappingRequestBody>;
export const EcsMappingRequestBody = z.object({
  packageName: PackageName,
  dataStreamName: DataStreamName,
  rawSamples: RawSamples,
  mapping: Mapping.optional(),
  connectorId: Connector,
});
export type EcsMappingRequestBodyInput = z.input<typeof EcsMappingRequestBody>;

export type EcsMappingResponse = z.infer<typeof EcsMappingResponse>;
export const EcsMappingResponse = EcsMappingAPIResponse;
