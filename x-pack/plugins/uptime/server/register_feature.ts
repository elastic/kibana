/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { PluginSetupContract } from '../../features/server';
import { PLUGIN } from '../common';

export const registerFeature = (features: PluginSetupContract) => {
  features.registerFeature({
    id: PLUGIN.ID,
    name: i18n.translate('xpack.uptime.featureRegistry.uptimeFeatureName', {
      defaultMessage: 'Uptime',
    }),
    navLinkId: PLUGIN.ID,
    icon: 'uptimeApp',
    app: ['uptime', 'kibana'],
    catalogue: ['uptime'],
    privileges: {
      all: {
        api: ['uptime'],
        savedObject: {
          all: [],
          read: [],
        },
        ui: ['save'],
      },
      read: {
        api: ['uptime'],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
  });
};
