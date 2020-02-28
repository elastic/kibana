/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface NewDatasource {
  enabled?: boolean;
  title?: string;
  package?: {
    name: string;
    version: string;
  };
  namespace?: string;
  use_output: string;
  inputs: Array<{
    type: string;
    processors?: string[];
    streams: Array<{
      id?: string;
      enabled?: boolean;
      dataset?: string;
      metricset?: string;
      paths?: string[];
    }>;
  }>;
}

export type Datasource = NewDatasource & { id: string };
