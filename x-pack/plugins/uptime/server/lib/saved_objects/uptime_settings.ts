/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'kibana/server';
import { i18n } from '@kbn/i18n';
export const settingsObjectType = 'uptime-dynamic-settings';
export const settingsObjectId = 'uptime-dynamic-settings-singleton';

export const umDynamicSettings: SavedObjectsType = {
  name: settingsObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      /* Leaving these commented to make it clear that these fields exist, even though we don't want them indexed.
         When adding new fields please add them here. If they need to be searchable put them in the uncommented
         part of properties.
      heartbeatIndices: {
        type: 'keyword',
      },
      certAgeThreshold: {
        type: 'long',
      },
      certExpirationThreshold: {
        type: 'long',
      },
      defaultConnectors: {
        type: 'keyword',
      },
      */
    },
  },
  management: {
    importableAndExportable: true,
    icon: 'uptimeApp',
    getTitle: () =>
      i18n.translate('xpack.uptime.uptimeSettings.index', {
        defaultMessage: 'Uptime Settings - Index',
      }),
  },
  migrations: {
    // Takes a pre 8.2.0 doc, and converts it to 8.2.0
    '8.2.0': (doc) => {
      const { heartbeatIndices } = doc.attributes;

      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          heartbeatIndices: heartbeatIndices.includes('synthetics-*')
            ? heartbeatIndices
            : heartbeatIndices + ',synthetics-*',
        },
      };
    },
  },
};
