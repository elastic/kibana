/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hostsReducer } from '../../hosts/store';
import { networkReducer } from '../../network/store';
import { timelineReducer } from '../../timelines/store/timeline/reducer';
import { hostListReducer } from '../../management/pages/endpoint_hosts/store';
import { alertListReducer } from '../../endpoint_alerts/store';
import { managementReducer } from '../../management/store';

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
  management: managementReducer,
};
