/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldValueOptionType, SearchFilterConfig } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import { UISession } from '../../types';

export const getAppFilter: (tableData: UISession[]) => SearchFilterConfig = (tableData) => ({
  type: 'field_value_selection',
  name: i18n.translate('xpack.data.mgmt.searchSessions.search.filterApp', {
    defaultMessage: 'App',
  }),
  field: 'appId',
  multiSelect: 'or',
  options: tableData.reduce((options: FieldValueOptionType[], { appId }) => {
    const existingOption = options.find((o) => o.value === appId);
    if (!existingOption) {
      return [...options, { value: appId, view: capitalize(appId) }];
    }

    return options;
  }, []),
});
