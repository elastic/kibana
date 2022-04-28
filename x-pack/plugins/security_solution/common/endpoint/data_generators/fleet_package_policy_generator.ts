/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { BaseDataGenerator } from './base_data_generator';
import { policyFactory } from '../models/policy_config';
import { PolicyData } from '../types';

type PartialPackagePolicy = Partial<Omit<PackagePolicy, 'inputs'>> & {
  inputs?: PackagePolicy['inputs'];
};

type PartialEndpointPolicyData = Partial<Omit<PolicyData, 'inputs'>> & {
  inputs?: PolicyData['inputs'];
};

export class FleetPackagePolicyGenerator extends BaseDataGenerator<PackagePolicy> {
  generate(overrides: PartialPackagePolicy = {}): PackagePolicy {
    return {
      id: this.seededUUIDv4(),
      name: `Package Policy {${this.randomString(4)})`,
      description: 'Policy to protect the worlds data',
      created_at: this.randomPastDate(),
      created_by: this.randomUser(),
      updated_at: new Date().toISOString(),
      updated_by: this.randomUser(),
      policy_id: this.seededUUIDv4(), // agent policy id
      enabled: true,
      output_id: '',
      inputs: [],
      namespace: 'default',
      package: {
        name: 'endpoint',
        title: 'Elastic Endpoint',
        version: '1.0.0',
      },
      revision: 1,
      ...overrides,
    };
  }

  generateEndpointPackagePolicy(overrides: PartialEndpointPolicyData = {}): PolicyData {
    return {
      ...this.generate({
        name: `Endpoint Policy {${this.randomString(4)})`,
      }),
      inputs: [
        {
          type: 'endpoint',
          enabled: true,
          streams: [],
          config: {
            artifact_manifest: {
              value: {
                manifest_version: '1.0.0',
                schema_version: 'v1',
                artifacts: {},
              },
            },
            policy: {
              value: policyFactory(),
            },
          },
        },
      ],
      ...overrides,
    };
  }
}
