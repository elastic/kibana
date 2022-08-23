/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { APM_EXPERIMENTAL_FEATURES_TYPE } from '../../common/apm_saved_object_constants';

export const apmExperimentalFeatures: SavedObjectsType = {
  name: APM_EXPERIMENTAL_FEATURES_TYPE,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    properties: {
      enableExperimentalFeatures: { type: 'boolean' },
      experimentalFeatures: { type: 'text' },
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.apm.apmServiceGroups.index', {
        defaultMessage: 'APM Experimental features - Index',
      }),
  },
};
