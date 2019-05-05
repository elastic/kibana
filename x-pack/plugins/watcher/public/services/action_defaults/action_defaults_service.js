/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash';

const actionDefaults = [];

const xpackWatcherActionDefaults = {
  register: actionDefaults.push,
};

const xpackWatcherActionDefaultsService = (config) => ({
  getDefaults: (watchType, actionType) => {
    const match = find(actionDefaults, { watchType, actionType });

    return match ? match.getDefaults(config, watchType) : {};
  }
});

export { xpackWatcherActionDefaultsService, xpackWatcherActionDefaults };
