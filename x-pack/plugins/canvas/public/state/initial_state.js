/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getDefaultWorkpad } from './defaults';

export const getInitialState = path => {
  const state = {
    app: {}, // Kibana stuff in here
    transient: {
      canUserWrite: true,
      fullscreen: false,
      selectedElement: null,
      resolvedArgs: {},
      refresh: {
        interval: 0,
      },
      // values in resolvedArgs should live under a unique index so they can be looked up.
      // The ID of the element is a great example.
      // In there will live an object with a status (string), value (any), and error (Error) property.
      // If the state is 'error', the error proprty will be the error object, the value will not change
      // See the resolved_args reducer for more information.
    },
    persistent: {
      schemaVersion: 1,
      workpad: getDefaultWorkpad(),
    },
  };

  if (!path) return state;

  return get(state, path);
};
