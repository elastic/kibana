/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { i18n } from '@kbn/i18n';
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

export const apmIndicesSpace: SavedObjectsType = {
  name: 'apm-indices-space',
  hidden: false,
  namespaceType: 'single',
  mappings: { properties },
  management: {
    importableAndExportable: true,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.apm.apmSettings.index', {
        defaultMessage: 'APM Settings - Index',
      }),
  },
};
