/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generatePath } from 'react-router-dom';
import {
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_PATH,
  MANAGEMENT_ROUTING_ROOT_PATH,
} from './constants';
import { ManagementSubTab } from '../types';
import { SiemPageName } from '../../app/types';

export type getManagementUrlArgs =
  | ['endpointList']
  | ['policyList']
  | ['policyDetails', { policyId: string }];

/**
 * Returns a URL string for a given Management page view
 * @param options
 */
export const getManagementUrl = (...args: getManagementUrlArgs): string => {
  // FIXME: should this method be renamed `getManagementRelativeUrl()` since it only return the value after the `#`?
  if (args[0] === 'endpointList') {
    return generatePath(MANAGEMENT_ROUTING_ENDPOINTS_PATH, {
      pageName: SiemPageName.management,
      tabName: ManagementSubTab.endpoints,
    });
  }
  if (args[0] === 'policyList') {
    return generatePath(MANAGEMENT_ROUTING_POLICIES_PATH, {
      pageName: SiemPageName.management,
      tabName: ManagementSubTab.policies,
    });
  }
  if (args[0] === 'policyDetails') {
    return generatePath(MANAGEMENT_ROUTING_POLICY_DETAILS_PATH, {
      pageName: SiemPageName.management,
      tabName: ManagementSubTab.policies,
      policyId: args[1].policyId,
    });
  }
  return MANAGEMENT_ROUTING_ROOT_PATH;
};
