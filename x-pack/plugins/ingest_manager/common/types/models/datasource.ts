/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface NewDatasource {
  name: string;
  namespace?: string;
  read_alias?: string;
  config_id: string;
  package?: {
    assets: Array<{
      id: string;
      type: string;
    }>;
    description: string;
    name: string;
    title: string;
    version: string;
  };
  streams: Array<{
    config: Record<string, any>;
    input: {
      type: string;
      config: Record<string, any>;
      fields?: Array<Record<string, any>>;
      ilm_policy?: string;
      index_template?: string;
      ingest_pipelines?: string[];
    };
    output_id: string;
    processors?: string[];
  }>;
}

export type Datasource = NewDatasource & { id: string };
