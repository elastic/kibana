/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hostsReducer } from '../../hosts/store';
import { networkReducer } from '../../network/store';
import { timelineReducer } from '../../timelines/store/timeline/reducer';
import { managementReducer } from '../../management/store/reducer';
import { ManagementPluginReducer } from '../../management';
import { SubPluginsInitReducer } from '../store';

interface Global extends NodeJS.Global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window?: any;
}

export const globalNode: Global = global;

export const SUB_PLUGINS_REDUCER: SubPluginsInitReducer = {
  hosts: hostsReducer,
  network: networkReducer,
  timeline: timelineReducer,
  /**
   * These state's are wrapped in `Immutable`, but for compatibility with the overall app architecture,
   * they are cast to mutable versions here.
   */
  management: managementReducer as ManagementPluginReducer['management'],
};
