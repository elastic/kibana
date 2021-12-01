/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export interface Pipeline {
  name: string;
  description?: string;
  version?: number;
  processors: Processor[];
  on_failure?: Processor[];
}

export interface PipelinesByName {
  [key: string]: {
    description: string;
    version?: number;
    processors: Processor[];
    on_failure?: Processor[];
  };
}

export enum FieldCopyAction {
  Copy = 'copy',
  Rename = 'rename',
}
