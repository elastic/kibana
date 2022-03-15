/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { GetPolicyListResponse } from '../../pages/policy/types';

export const sendGetEndpointSpecificPackagePoliciesMock = async (
  params: {
    page: number;
    perPage: number;
    count: number;
  } = { page: 1, perPage: 20, count: 5 }
): Promise<GetPolicyListResponse> => {
  const { page, perPage, count } = params;
  const generator = new FleetPackagePolicyGenerator();
  const items = Array.from({ length: count }, (_, index) => {
    const policy = generator.generateEndpointPackagePolicy();
    policy.name += ` ${index}`;
    return policy;
  });

  return {
    items,
    total: count,
    page,
    perPage,
  };
};
