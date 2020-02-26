/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface NewDatasource {
  name: string;
  namespace?: string;
  config_id: string;
  enabled: boolean;
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
  output_id: string;
  inputs: Array<{
    type: string;
    enabled: boolean;
    processors?: string[];
    streams: Array<{
      id: string;
      enabled: boolean;
      dataset: string;
      processors?: string[];
      config?: Record<string, any>;
    }>;
  }>;
}

export type Datasource = NewDatasource & { id: string };
