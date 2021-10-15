/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { updateApmOssIndexPaths } from './migrations/update_apm_oss_index_paths';
import { ApmIndicesConfigName } from '..';

const properties: { [Property in ApmIndicesConfigName]: { type: 'keyword' } } =
  {
    sourcemap: { type: 'keyword' },
    error: { type: 'keyword' },
    onboarding: { type: 'keyword' },
    span: { type: 'keyword' },
    transaction: { type: 'keyword' },
    metric: { type: 'keyword' },
  };

export const apmIndices: SavedObjectsType = {
  name: 'apm-indices',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: { properties },
  management: {
    importableAndExportable: true,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.apm.apmSettings.index', {
        defaultMessage: 'APM Settings - Index',
      }),
  },
  migrations: {
    '7.16.0': (doc) => {
      const attributes = updateApmOssIndexPaths(doc.attributes);
      return { ...doc, attributes };
    },
  },
};
