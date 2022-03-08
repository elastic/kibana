/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PackagePolicyPackage,
  NewPackagePolicy,
  NewPackagePolicyInput,
} from './package_policy';
import type { NewAgentPolicy } from './agent_policy';
import type { Output } from './output';

// TODO: This type is not usable directly, and instead we typically use a type assertion
// e.g. `NewPackagePolicyInput as InputsOverride[]`. This type should be altered so that it's
// possible to use it directly in tests, etc
export type InputsOverride = Partial<NewPackagePolicyInput> & {
  vars?: Array<NewPackagePolicyInput['vars'] & { name: string }>;
};

export interface PreconfiguredAgentPolicy extends Omit<NewAgentPolicy, 'namespace' | 'id'> {
  id: string | number;
  namespace?: string;
  package_policies: Array<
    Partial<Omit<NewPackagePolicy, 'inputs' | 'package'>> & {
      id?: string | number;
      name: string;
      package: Partial<PackagePolicyPackage> & { name: string };
      inputs?: InputsOverride[];
    }
  >;
}

export type PreconfiguredPackage = Omit<PackagePolicyPackage, 'title'>;

export interface PreconfiguredOutput extends Omit<Output, 'config_yaml'> {
  config?: Record<string, unknown>;
}
