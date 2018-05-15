/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flattenPipelineSection } from './flatten_pipeline_section';

export function pipelineToList(pipeline) {
  const inputs = flattenPipelineSection(pipeline.inputStatements, 0, null);
  const filters = flattenPipelineSection(pipeline.filterStatements, 0, null);
  const outputs = flattenPipelineSection(pipeline.outputStatements, 0, null);
  const { queue } = pipeline;

  return {
    inputs,
    filters,
    outputs,
    queue,
  };
}
