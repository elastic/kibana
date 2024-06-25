/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TABLE_COLUMNS = [
  {
    field: 'endpoint',
    name: i18n.translate('xpack.searchInferenceEndpoints.inferenceEndpoints.table.endpoint', {
      defaultMessage: 'Endpoint',
    }),
    sortable: true,
    width: '50%',
  },
  {
    field: 'provider',
    name: i18n.translate('xpack.searchInferenceEndpoints.inferenceEndpoints.table.provider', {
      defaultMessage: 'Provider',
    }),
    sortable: false,
    width: '110px',
  },
  {
    field: 'type',
    name: i18n.translate('xpack.searchInferenceEndpoints.inferenceEndpoints.table.type', {
      defaultMessage: 'Type',
    }),
    sortable: false,
    width: '90px',
  },
];
