/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';


import { FieldList } from '../../field_list';

const columns = [{
  field: 'name',
  name: i18n.translate('xpack.rollupJobs.jobDetails.tabMetrics.nameColumnLabel', {
    defaultMessage: 'Field' }),
  sortable: true,
}, {
  name: i18n.translate('xpack.rollupJobs.jobDetails.tabMetrics.typesColumnLabel', {
    defaultMessage: 'Types' }),
  render: ({ types }) => types.sort().join(', '),
}];

export const TabMetrics = ({ metrics }) => (
  <FieldList
    columns={columns}
    fields={metrics}
    dataTestSubj="detailPanelMetricsTabTable"
  />
);
