/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { coreServices } from '../services/kibana_services';
import { getDefaultWorkpad, getDefaultSidebar, getDefaultFlyouts } from './defaults';

export const getInitialState = (path) => {
  const state = {
    app: {}, // Kibana stuff in here
    assets: {}, // assets end up here
    transient: {
      canUserWrite: coreServices.application.capabilities.canvas.save,
      zoomScale: 1,
      elementStats: {
        total: 0,
        ready: 0,
        pending: 0,
        error: 0,
      },
      fullscreen: false,
      selectedToplevelNodes: [],
      resolvedArgs: {},
      refresh: {
        interval: 0,
      },
      autoplay: {
        enabled: false,
        interval: 10000,
      },
      // values in resolvedArgs should live under a unique index so they can be looked up.
      // The ID of the element is a great example.
      // In there will live an object with a status (string), value (any), and error (Error) property.
      // If the state is 'error', the error property will be the error object, the value will not change
      // See the resolved_args reducer for more information.
      sidebar: getDefaultSidebar(),
      flyouts: getDefaultFlyouts(),
    },
    persistent: {
      schemaVersion: 2,
      workpad: getDefaultWorkpad(),
    },
  };

  if (!path) {
    return state;
  }

  return get(state, path);
};
