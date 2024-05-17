/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from 'redux';
import { addCluster } from './add_cluster';
import { clusters } from './clusters';
import { detailPanel } from './detail_panel';
import { editCluster } from './edit_cluster';
import { removeCluster } from './remove_cluster';

export const remoteClusters = combineReducers({
  clusters,
  detailPanel,
  addCluster,
  removeCluster,
  editCluster,
});
