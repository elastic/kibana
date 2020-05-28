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

export type GetManagementUrlProps = {
  /**
   * Exclude the URL prefix (everything to the left of where the router was mounted.
   * This may be needed when interacting with react-router (ex. to do `history.push()` or
   * validations against matched path)
   */
  excludePrefix?: boolean;
} & (
  | { name: 'default' }
  | { name: 'endpointList' }
  | { name: 'policyList' }
  | { name: 'policyDetails'; policyId: string }
);

// Prefix is (almost) everything to the left of where the Router was mounted. In SIEM, since
// we're using Hash router, thats the `#`.
const URL_PREFIX = '#';

/**
 * Returns a URL string for a given Management page view
 * @param props
 */
export const getManagementUrl = (props: GetManagementUrlProps): string => {
  let url = props.excludePrefix ? '' : URL_PREFIX;

  switch (props.name) {
    case 'default':
      url += generatePath(MANAGEMENT_ROUTING_ROOT_PATH, {
        pageName: SiemPageName.management,
      });
      break;
    case 'endpointList':
      url += generatePath(MANAGEMENT_ROUTING_ENDPOINTS_PATH, {
        pageName: SiemPageName.management,
        tabName: ManagementSubTab.endpoints,
      });
      break;
    case 'policyList':
      url += generatePath(MANAGEMENT_ROUTING_POLICIES_PATH, {
        pageName: SiemPageName.management,
        tabName: ManagementSubTab.policies,
      });
      break;
    case 'policyDetails':
      url += generatePath(MANAGEMENT_ROUTING_POLICY_DETAILS_PATH, {
        pageName: SiemPageName.management,
        tabName: ManagementSubTab.policies,
        policyId: props.policyId,
      });
      break;
  }

  return url;
};
