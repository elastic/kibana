/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PackagePolicyPackage {
  name: string;
  title: string;
  version: string;
}

export interface PackagePolicyConfigRecordEntry {
  type?: string;
  value?: any;
  frozen?: boolean;
}

export type PackagePolicyConfigRecord = Record<string, PackagePolicyConfigRecordEntry>;

export interface NewPackagePolicyInputStream {
  enabled: boolean;
  keep_enabled?: boolean;
  data_stream: {
    dataset: string;
    type: string;
    elasticsearch?: {
      privileges?: {
        indices?: string[];
      };
    };
  };
  vars?: PackagePolicyConfigRecord;
  config?: PackagePolicyConfigRecord;
}

export interface PackagePolicyInputStream extends NewPackagePolicyInputStream {
  id: string;
  compiled_stream?: any;
}

export interface NewPackagePolicyInput {
  type: string;
  policy_template?: string;
  enabled: boolean;
  keep_enabled?: boolean;
  vars?: PackagePolicyConfigRecord;
  config?: PackagePolicyConfigRecord;
  streams: NewPackagePolicyInputStream[];
}

export interface PackagePolicyInput extends Omit<NewPackagePolicyInput, 'streams'> {
  streams: PackagePolicyInputStream[];
  compiled_input?: any;
}

export interface NewPackagePolicy {
  id?: string | number;
  name: string;
  description?: string;
  namespace: string;
  enabled: boolean;
  policy_id: string;
  output_id: string;
  package?: PackagePolicyPackage;
  inputs: NewPackagePolicyInput[];
  vars?: PackagePolicyConfigRecord;
  elasticsearch?: {
    privileges?: {
      cluster?: string[];
    };
  };
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

export type DryRunPackagePolicy = NewPackagePolicy & {
  errors?: Array<{ key: string | undefined; message: string }>;
  missingVars?: string[];
};
