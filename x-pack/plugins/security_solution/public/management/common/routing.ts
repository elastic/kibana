/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generatePath } from 'react-router-dom';
// eslint-disable-next-line import/no-nodejs-modules

import {
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_PATH,
} from './constants';
import { ManagementSubTab } from '../types';
import { appendSearch } from '../../common/components/link_to/helpers';

export const getEndpointPath = (search?: string) =>
  `/${generatePath(MANAGEMENT_ROUTING_ENDPOINTS_PATH, {
    tabName: ManagementSubTab.endpoints,
  })}${appendSearch(search ?? undefined)}`;

export const getPoliciesPath = (search?: string) =>
  `/${generatePath(MANAGEMENT_ROUTING_POLICIES_PATH, {
    tabName: ManagementSubTab.policies,
  })}${appendSearch(search ?? undefined)}`;

export const getPolicyDetailPath = (policyId: string, search?: string) =>
  `/${generatePath(MANAGEMENT_ROUTING_POLICY_DETAILS_PATH, {
    tabName: ManagementSubTab.policies,
    policyId,
  })}${appendSearch(search ?? undefined)}`;
