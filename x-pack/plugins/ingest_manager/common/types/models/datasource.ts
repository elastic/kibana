/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface DatasourcePackage {
  name: string;
  title: string;
  version: string;
}

export interface DatasourceInputStream {
  id: string;
  enabled: boolean;
  dataset: string;
  processors?: string[];
  config?: Record<
    string,
    {
      type?: string;
      value: any;
    }
  >;
}

export interface DatasourceInput {
  type: string;
  enabled: boolean;
  processors?: string[];
  streams: DatasourceInputStream[];
}

export interface NewDatasource {
  name: string;
  description?: string;
  namespace?: string;
  config_id: string;
  enabled: boolean;
  package?: DatasourcePackage;
  output_id: string;
  inputs: DatasourceInput[];
}

export type Datasource = NewDatasource & {
  id: string;
  revision: number;
};
