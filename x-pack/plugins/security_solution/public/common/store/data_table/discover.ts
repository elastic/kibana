/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { Action } from 'redux';
import { updateDiscoverAppState } from '../discover/actions';
import type { SecuritySolutionDiscoverState } from '../discover/model';
import { initialDiscoverAppState } from '../discover/model';

const discoverActionTypes = [updateDiscoverAppState.type];

const LOCAL_STORAGE_DISCOVER_KEY = 'securitySolution.discover';

export const addDiscoverToStorage = ({
  storage,
  action,
  discoverState,
}: {
  storage: Storage;
  action: Action;
  discoverState: SecuritySolutionDiscoverState;
}) => {
  if (!discoverActionTypes.includes(action.type)) return;

  if (!storage) return;

  storage.set(LOCAL_STORAGE_DISCOVER_KEY, discoverState);
};

export const restoreDiscoverFromStorage = ({ storage }: { storage: Storage }) => {
  const storedDiscoverState = storage.get(LOCAL_STORAGE_DISCOVER_KEY);

  if (!storedDiscoverState) return initialDiscoverAppState;

  return storedDiscoverState;
};
