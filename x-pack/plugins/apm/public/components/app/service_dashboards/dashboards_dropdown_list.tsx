/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { useDashboardFetcher } from '../../../hooks/use_dashboards_fetcher';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

export function DashboardsDropdownList() {
  const { data, status } = useDashboardFetcher();

  const onChange = (
    selectedOptions: Array<EuiComboBoxOptionOption<string>>
  ) => {
    onChangeDashboard(selectedOptions);
  };

  return (
    <EuiComboBox
      isLoading={status === FETCH_STATUS.LOADING}
      isDisabled={status === FETCH_STATUS.LOADING}
      placeholder={i18n.translate(
        'xpack.apm.serviceDashboards.selectDashboard.placeholder',
        {
          defaultMessage: 'Select dasbboard',
        }
      )}
      singleSelection={{ asPlainText: true }}
      options={data?.map((dashboardItem) => ({
        label: dashboardItem.attributes.title,
        value: dashboardItem.id,
      }))}
      selectedOptions={selectedDashboard}
      onChange={onChange}
      isClearable={true}
    />
  );
}
