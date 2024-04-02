/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hostsReducer } from '../../explore/hosts/store';
import { networkReducer } from '../../explore/network/store';
import { makeUsersReducer } from '../../explore/users/store';
import { timelineReducer } from '../../timelines/store/reducer';
import { managementReducer } from '../../management/store/reducer';
import type { ManagementPluginReducer } from '../../management';
import type { SubPluginsInitReducer } from '../store';
import { createSecuritySolutionStorageMock } from './mock_local_storage';

type GlobalThis = typeof globalThis;
interface Global extends GlobalThis {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any;
}

export const globalNode: Global = global;

const { storage } = createSecuritySolutionStorageMock();

export const SUB_PLUGINS_REDUCER: SubPluginsInitReducer = {
  hosts: hostsReducer,
  network: networkReducer,
  users: makeUsersReducer(storage),
  timeline: timelineReducer,
  /**
   * These state's are wrapped in `Immutable`, but for compatibility with the overall app architecture,
   * they are cast to mutable versions here.
   */
  management: managementReducer as unknown as ManagementPluginReducer['management'],
};
