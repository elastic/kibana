/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PipelinesByName, Pipeline } from '../types';

export function deserializePipelines(pipelinesByName: PipelinesByName): Pipeline[] {
  const pipelineNames: string[] = Object.keys(pipelinesByName);

  const deserializedPipelines = pipelineNames.map((name: string) => {
    const { description, version, processors, on_failure } = pipelinesByName[name];

    const pipeline = {
      name,
      description,
      version,
      processors,
      onFailure: on_failure,
    };

    return pipeline;
  });

  return deserializedPipelines;
}
