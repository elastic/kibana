/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createAction } from 'redux-actions';
import { SET_SELECTED_NODE_ATTRS } from '../../constants';

export const setSelectedNodeAttrs = createAction(SET_SELECTED_NODE_ATTRS);
export const setSelectedPrimaryShardCount = createAction('SET_SELECTED_PRIMARY_SHARED_COUNT');
export const setSelectedReplicaCount = createAction('SET_SELECTED_REPLICA_COUNT');
