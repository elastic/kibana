/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Pipeline as ESPipeline } from '@elastic/elasticsearch/api/types';

export interface ESProcessorConfig {
  on_failure?: Processor[];
  ignore_failure?: boolean;
  if?: string;
  tag?: string;
  [key: string]: any;
}

export interface Processor {
  [typeName: string]: ESProcessorConfig;
}

export interface Pipeline extends ESPipeline {
  name: string;
}

export interface PipelinesByName {
  [key: string]: ESPipeline;
}
