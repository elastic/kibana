/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ACTION_STATES = {

  // Action is not being executed because conditions haven't been met
  OK: i18n.translate('xpack.watcher.constants.actionStates.okStateText', {
    defaultMessage: 'OK'
  }),

  // Action has been acknowledged by user
  ACKNOWLEDGED: i18n.translate('xpack.watcher.constants.actionStates.acknowledgedStateText', {
    defaultMessage: 'Acked'
  }),

  // Action has been throttled (time-based) by the system
  THROTTLED: i18n.translate('xpack.watcher.constants.actionStates.throttledStateText', {
    defaultMessage: 'Throttled'
  }),

  // Action has been completed
  FIRING: i18n.translate('xpack.watcher.constants.actionStates.firingStateText', {
    defaultMessage: 'Firing'
  }),

  // Action has failed
  ERROR: i18n.translate('xpack.watcher.constants.actionStates.errorStateText', {
    defaultMessage: 'Error'
  }),

  // Action has a configuration error
  CONFIG_ERROR: i18n.translate('xpack.watcher.constants.actionStates.configErrorStateText', {
    defaultMessage: 'Config error'
  }),

};
