/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE } from '../../common/apm_saved_object_constants';

export const apmServerSettings: SavedObjectsType = {
  name: APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE,
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
      i18n.translate('xpack.apm.apmSchema.index', {
        defaultMessage: 'APM Server Schema - Index',
      }),
  },
};
