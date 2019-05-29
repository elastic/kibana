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

// Reducer
export function nonSerializableInstances(state) {
  if (!state) {
    return {
      inspectorAdapters: createInspectorAdapters(),
    };
  }

  // state is read only and provides access to non-serializeable object instances
  return state;
}

// Selectors
export const getInspectorAdapters = ({ nonSerializableInstances }) => {
  return _.get(nonSerializableInstances, 'inspectorAdapters', {});
};
