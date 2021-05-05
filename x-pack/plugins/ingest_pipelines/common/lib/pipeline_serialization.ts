/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Pipeline as ESPipeline } from '@elastic/elasticsearch/api/types';
import { Pipeline, Processor } from '../types';

export function deserializePipelines(pipelinesByName: { [key: string]: ESPipeline }): Pipeline[] {
  const pipelineNames: string[] = Object.keys(pipelinesByName);

  const deserializedPipelines = pipelineNames.map<Pipeline>((name: string) => {
    return {
      ...pipelinesByName[name],
      processors: (pipelinesByName[name]?.processors as Processor[]) ?? [],
      on_failure: pipelinesByName[name]?.on_failure as Processor[],
      name,
    };
  });

  return deserializedPipelines;
}
