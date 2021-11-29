/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { GetPolicyListResponse } from '../../pages/policy/types';

export const sendGetEndpointSpecificPackagePoliciesMock =
  async (): Promise<GetPolicyListResponse> => {
    const generator = new FleetPackagePolicyGenerator();
    const items = Array.from({ length: 5 }, (_, index) => {
      const policy = generator.generateEndpointPackagePolicy();
      policy.name += ` ${index}`;
      return policy;
    });

    return {
      items,
      total: 5,
      page: 1,
      perPage: 10,
    };
  };
