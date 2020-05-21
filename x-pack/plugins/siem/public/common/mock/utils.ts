/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hostsReducer } from '../../hosts/store';
import { networkReducer } from '../../network/store';
import { timelineReducer } from '../../timelines/store/timeline/reducer';
import { hostListReducer } from '../../endpoint_hosts/store';
import { alertListReducer } from '../../endpoint_alerts/store';
import { policyListReducer } from '../../endpoint_policy/store/policy_list';
import { policyDetailsReducer } from '../../endpoint_policy/store/policy_details';

interface Global extends NodeJS.Global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window?: any;
}

export const globalNode: Global = global;

export const SUB_PLUGINS_REDUCER = {
  hosts: hostsReducer,
  network: networkReducer,
  timeline: timelineReducer,
  hostList: hostListReducer,
  alertList: alertListReducer,
  policyList: policyListReducer,
  policyDetails: policyDetailsReducer,
};
