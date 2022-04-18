/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

export const syntheticsMonitorType = 'synthetics-monitor';

export const syntheticsMonitor: SavedObjectsType = {
  name: syntheticsMonitorType,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
        fielddata: true,
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      id: {
        type: 'keyword',
      },
      type: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      urls: {
        type: 'text',
      },
      tags: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      locations: {
        type: 'object',
        properties: {
          id: {
            type: 'keyword',
          },
        },
      },
    },
  },
  management: {
    importableAndExportable: true,
    icon: 'uptimeApp',
    getTitle: (savedObject) =>
      savedObject.attributes.name +
      ' - ' +
      i18n.translate('xpack.uptime.syntheticsMonitors', {
        defaultMessage: 'Uptime - Monitor',
      }),
  },
};
