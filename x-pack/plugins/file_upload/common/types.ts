/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ImportResponse {
  success: boolean;
  id: string;
  index?: string;
  pipelineId?: string;
  docCount: number;
  failures: ImportFailure[];
  error?: any;
  ingestError?: boolean;
}

export interface ImportFailure {
  item: number;
  reason: string;
  doc: ImportDoc;
}

export interface Doc {
  message: string;
}

export type ImportDoc = Doc | string;

export interface Settings {
  pipeline?: string;
  index: string;
  body: any[];
  [key: string]: any;
}

export interface Mappings {
  _meta?: {
    created_by: string;
  };
  properties: {
    [key: string]: any;
  };
}

export interface IngestPipelineWrapper {
  id: string;
  pipeline: IngestPipeline;
}

export interface IngestPipeline {
  description: string;
  processors: any[];
}
