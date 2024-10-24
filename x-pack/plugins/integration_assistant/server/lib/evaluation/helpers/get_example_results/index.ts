/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from 'langsmith/schemas';
import { EcsMappingResponse, Pipeline } from '../../../../../common';
import { Mapping } from '../../../../../common/api/model/common_attributes.gen';

export const getExampleEcsResults = (example: Example | undefined): EcsMappingResponse => {
  const mapping = example?.outputs?.results.mapping;
  const pipeline = example?.outputs?.results.pipeline;

  // NOTE: calls to `parse` throw an error if the Example input is invalid
  const validatedPipeline = Pipeline.parse(pipeline);
  const validatedMapping = Mapping.parse(mapping);

  const results = EcsMappingResponse.parse({
    results: { pipeline: validatedPipeline, mapping: validatedMapping },
  });

  return results;
};
