/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { i18n } from '@kbn/i18n';

export const apmServerSettings: SavedObjectsType = {
  name: 'apm-server-settings',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      schemaJson: {
        type: 'text',
        index: false,
      },
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.apm.apmSettings.index', {
        defaultMessage: 'APM Server Settings - Index',
      }),
  },
};
