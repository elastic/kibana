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

export interface DatasourceConfigRecordEntry {
  type?: string;
  value?: any;
}

export type DatasourceConfigRecord = Record<string, DatasourceConfigRecordEntry>;

export interface NewDatasourceInputStream {
  id: string;
  enabled: boolean;
  dataset: string;
  processors?: string[];
  config?: DatasourceConfigRecord;
  vars?: DatasourceConfigRecord;
}

export interface DatasourceInputStream extends NewDatasourceInputStream {
  agent_stream?: any;
}

export interface NewDatasourceInput {
  type: string;
  enabled: boolean;
  processors?: string[];
  config?: DatasourceConfigRecord;
  vars?: DatasourceConfigRecord;
  streams: NewDatasourceInputStream[];
}

export interface DatasourceInput extends Omit<NewDatasourceInput, 'streams'> {
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
  inputs: NewDatasourceInput[];
}

export interface Datasource extends Omit<NewDatasource, 'inputs'> {
  id: string;
  inputs: DatasourceInput[];
  revision: number;
}
