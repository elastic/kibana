/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchOptions, HttpStart } from 'kibana/public';
import {
  GetPackagePoliciesRequest,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../../fleet/common';
import { GetPolicyListResponse } from '../../pages/policy/types';
import { INGEST_API_PACKAGE_POLICIES } from './ingest';

/**
 * Retrieves a list of endpoint specific package policies (those created with a `package.name` of
 * `endpoint`) from Ingest
 * @param http
 * @param options
 */
export const sendGetEndpointSpecificPackagePolicies = (
  http: HttpStart,
  options: HttpFetchOptions & Partial<GetPackagePoliciesRequest> = {}
): Promise<GetPolicyListResponse> => {
  return http.get<GetPolicyListResponse>(INGEST_API_PACKAGE_POLICIES, {
    ...options,
    query: {
      ...options.query,
      kuery: `${
        options?.query?.kuery ? `${options.query.kuery} and ` : ''
      }${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
    },
  });
};
