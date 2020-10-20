/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface PackagePolicyPackage {
  name: string;
  title: string;
  version: string;
}

export interface PackagePolicyConfigRecordEntry {
  type?: string;
  value?: any;
}

export type PackagePolicyConfigRecord = Record<string, PackagePolicyConfigRecordEntry>;

export interface NewPackagePolicyInputStream {
  id: string;
  enabled: boolean;
  data_stream: {
    dataset: string;
    type: string;
  };
  vars?: PackagePolicyConfigRecord;
  config?: PackagePolicyConfigRecord;
}

export interface PackagePolicyInputStream extends NewPackagePolicyInputStream {
  compiled_stream?: any;
}

export interface NewPackagePolicyInput {
  type: string;
  enabled: boolean;
  vars?: PackagePolicyConfigRecord;
  config?: PackagePolicyConfigRecord;
  streams: NewPackagePolicyInputStream[];
}

export interface PackagePolicyInput extends Omit<NewPackagePolicyInput, 'streams'> {
  streams: PackagePolicyInputStream[];
}

export interface NewPackagePolicy {
  name: string;
  description?: string;
  namespace: string;
  enabled: boolean;
  policy_id: string;
  output_id: string;
  package?: PackagePolicyPackage;
  inputs: NewPackagePolicyInput[];
}

export interface UpdatePackagePolicy extends NewPackagePolicy {
  version?: string;
}

export interface PackagePolicy extends Omit<NewPackagePolicy, 'inputs'> {
  id: string;
  inputs: PackagePolicyInput[];
  version?: string;
  revision: number;
  updated_at: string;
  updated_by: string;
  created_at: string;
  created_by: string;
}

export type PackagePolicySOAttributes = Omit<PackagePolicy, 'id' | 'version'>;
