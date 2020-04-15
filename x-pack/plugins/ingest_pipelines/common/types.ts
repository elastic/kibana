/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Processor {
  [key: string]: {
    [key: string]: unknown;
  };
}

export interface Pipeline {
  name: string;
  description: string;
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
