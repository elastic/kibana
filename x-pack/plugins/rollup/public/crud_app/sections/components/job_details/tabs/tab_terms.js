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
}];

export const TabTermsUi = ({ terms }) => (
  <FieldList
    columns={columns}
    fields={terms}
  />
);

export const TabTerms = injectI18n(TabTermsUi);
