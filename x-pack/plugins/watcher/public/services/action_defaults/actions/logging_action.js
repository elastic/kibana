/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';
import { ACTION_TYPES, WATCH_TYPES } from 'plugins/watcher/../common/constants';
import { ActionDefaultsRegistryProvider } from '../registry';

const actionType = ACTION_TYPES.LOGGING;

function getActionDefaults() {
  return {};
}

ActionDefaultsRegistryProvider.register(() => {
  return {
    actionType,
    watchType: WATCH_TYPES.THRESHOLD,
    getDefaults: (config) => {
      const actionDefaults = getActionDefaults(config);
      const actionWatchComboDefaults = {
        text: 'Watch [{{ctx.metadata.name}}] has exceeded the threshold'
      };

      return merge(actionDefaults, actionWatchComboDefaults);
    }
  };
});
