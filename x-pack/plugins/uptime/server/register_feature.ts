/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { PluginSetupContract } from '../../features/server';
import { PLUGIN } from '../common';
import { umDynamicSettings } from './lib/saved_objects';

export const registerFeature = (features: PluginSetupContract) => {
  features.registerFeature({
    id: PLUGIN.ID,
    name: PLUGIN.NAME,
    order: 1000,
    navLinkId: PLUGIN.ID,
    icon: 'uptimeApp',
    app: ['uptime', 'kibana'],
    catalogue: ['uptime'],
    privileges: {
      all: {
        app: ['uptime', 'kibana'],
        catalogue: ['uptime'],
        api: [
          'uptime-read',
          'uptime-write',
          'actions-read',
          'actions-all',
          'alerting-read',
          'alerting-all',
        ],
        savedObject: {
          all: [umDynamicSettings.name, 'alert', 'action', 'action_task_params'],
          read: [],
        },
        ui: [
          'save',
          'configureSettings',
          'show',
          'alerting:show',
          'actions:show',
          'alerting:save',
          'actions:save',
          'alerting:delete',
          'actions:delete',
        ],
      },
      read: {
        app: ['uptime', 'kibana'],
        catalogue: ['uptime'],
        api: ['uptime-read', 'actions-read', 'actions-all', 'alerting-read', 'alerting-all'],
        savedObject: {
          all: ['alert', 'action', 'action_task_params'],
          read: [umDynamicSettings.name],
        },
        ui: [
          'show',
          'alerting:show',
          'actions:show',
          'alerting:save',
          'actions:save',
          'alerting:delete',
          'actions:delete',
        ],
      },
    },
  });
};
