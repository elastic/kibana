/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import chrome from 'ui/chrome';
import { RequestAdapter } from 'ui/inspector/adapters';
import { MapAdapter } from '../inspector/adapters/map_adapter';

function createInspectorAdapters() {
  const inspectorAdapters = {
    requests: new RequestAdapter(),
  };
  if (chrome.getInjected('showMapsInspectorAdapter', false)) {
    inspectorAdapters.map = new MapAdapter();
  }
  return inspectorAdapters;
}


const INITIAL_STATE = {
  inspectorAdapters: createInspectorAdapters(),
};

// Reducer
export function nonSerializableKibanaInstances(state = INITIAL_STATE) {
  // nonSerializableKibanaInstances state is read only and provides access to kibana object instances
  return state;
}

// Selectors
export const getInspectorAdapters = ({ nonSerializableKibanaInstances }) => {
  return _.get(nonSerializableKibanaInstances, 'inspectorAdapters', {});
};
