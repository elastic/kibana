/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetPolicyListResponse } from '../../policy/types';

import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';

export const getGeneratedPolicyResponse = (): GetPolicyListResponse => ({
  items: [new EndpointDocGenerator('seed').generatePolicyPackagePolicy()],
  total: 1,
  perPage: 1,
  page: 1,
});
