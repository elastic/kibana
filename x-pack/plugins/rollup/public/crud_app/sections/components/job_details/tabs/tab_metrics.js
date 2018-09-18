/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { injectI18n } from '@kbn/i18n/react';

import { FieldList } from '../../field_list';

const columns = [{
  field: 'name',
  name: 'Field',
  truncateText: true,
  sortable: true,
}, {
  name: 'Types',
  render: ({ types }) => types.join(', '),
}];

export const TabMetricsUi = ({ metrics }) => (
  <FieldList
    columns={columns}
    fields={metrics}
  />
);

export const TabMetrics = injectI18n(TabMetricsUi);
