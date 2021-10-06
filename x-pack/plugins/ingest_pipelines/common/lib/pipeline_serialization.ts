/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Pipeline, Processor } from '../types';

export function deserializePipelines(pipelinesByName: {
  [key: string]: estypes.IngestPipeline;
}): Pipeline[] {
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
