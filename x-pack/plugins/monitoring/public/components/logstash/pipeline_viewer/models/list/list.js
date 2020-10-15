/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flattenPipelineSection } from './flatten_pipeline_section';

export class List {
  constructor(inputs, filters, outputs, queue) {
    this.inputs = inputs;
    this.filters = filters;
    this.outputs = outputs;
    this.queue = queue;
  }

  static fromPipeline(pipeline) {
    const { inputStatements, filterStatements, outputStatements, queue } = pipeline;

    return new List(
      flattenPipelineSection(inputStatements),
      flattenPipelineSection(filterStatements),
      flattenPipelineSection(outputStatements),
      queue
    );
  }
}
