/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';
import { ACTION_TYPES, WATCH_TYPES } from 'plugins/watcher/../common/constants';
import { ActionDefaultsRegistryProvider } from '../registry';

const DEFAULT_ADMIN_EMAIL_CONFIG_KEY = 'xPack:defaultAdminEmail';
const actionType = ACTION_TYPES.EMAIL;

function getActionDefaults(config) {
  return {
    to: config.get(DEFAULT_ADMIN_EMAIL_CONFIG_KEY)
  };
}

ActionDefaultsRegistryProvider.register(() => {
  return {
    actionType,
    watchType: WATCH_TYPES.THRESHOLD,
    getDefaults: (config) => {
      const actionDefaults = getActionDefaults(config);
      const actionWatchComboDefaults = {
        subject: 'Watch [{{ctx.metadata.name}}] has exceeded the threshold'
      };

      return merge(actionDefaults, actionWatchComboDefaults);
    }
  };
});
