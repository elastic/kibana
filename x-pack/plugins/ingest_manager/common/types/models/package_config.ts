/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface PackageConfigPackage {
  name: string;
  title: string;
  version: string;
}

export interface PackageConfigConfigRecordEntry {
  type?: string;
  value?: any;
}

export type PackageConfigConfigRecord = Record<string, PackageConfigConfigRecordEntry>;

export interface NewPackageConfigInputStream {
  id: string;
  enabled: boolean;
  dataset: {
    name: string;
    type: string;
  };
  vars?: PackageConfigConfigRecord;
  config?: PackageConfigConfigRecord;
}

export interface PackageConfigInputStream extends NewPackageConfigInputStream {
  compiled_stream?: any;
}

export interface NewPackageConfigInput {
  type: string;
  enabled: boolean;
  vars?: PackageConfigConfigRecord;
  config?: PackageConfigConfigRecord;
  streams: NewPackageConfigInputStream[];
}

export interface PackageConfigInput extends Omit<NewPackageConfigInput, 'streams'> {
  streams: PackageConfigInputStream[];
}

export interface NewPackageConfig {
  name: string;
  description?: string;
  namespace: string;
  enabled: boolean;
  config_id: string;
  output_id: string;
  package?: PackageConfigPackage;
  inputs: NewPackageConfigInput[];
}

export interface UpdatePackageConfig extends NewPackageConfig {
  version?: string;
}

export interface PackageConfig extends Omit<NewPackageConfig, 'inputs'> {
  id: string;
  inputs: PackageConfigInput[];
  version?: string;
  revision: number;
  updated_at: string;
  updated_by: string;
  created_at: string;
  created_by: string;
}

export type PackageConfigSOAttributes = Omit<PackageConfig, 'id' | 'version'>;
