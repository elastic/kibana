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

export type InputsOverride = Partial<NewPackagePolicyInput> & {
  vars?: Array<NewPackagePolicyInput['vars'] & { name: string }>;
};

export interface PreconfiguredAgentPolicy extends Omit<NewAgentPolicy, 'namespace'> {
  id: string | number;
  namespace?: string;
  package_policies: Array<
    Partial<Omit<NewPackagePolicy, 'inputs' | 'package'>> & {
      name: string;
      package: Partial<PackagePolicyPackage> & { name: string };
      inputs?: InputsOverride[];
    }
  >;
}

export type PreconfiguredPackage = Omit<PackagePolicyPackage, 'title'>;
