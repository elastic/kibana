/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SavedServiceDashboard } from '../../../../common/service_dashboards';

interface Props {
  serviceDashboards: SavedServiceDashboard[];
  currentDashboard?: SavedServiceDashboard;
  handleOnChange: (selectedId: string) => void;
}

export function DashboardSelector({
  serviceDashboards,
  currentDashboard,
  handleOnChange,
}: Props) {
  return (
    <EuiComboBox
      compressed
      style={{ minWidth: '200px' }}
      placeholder={i18n.translate(
        'xpack.apm.serviceDashboards.selectDashboard.placeholder',
        {
          defaultMessage: 'Select dasbboard',
        }
      )}
      prepend={i18n.translate(
        'xpack.apm.serviceDashboards.selectDashboard.prepend',
        {
          defaultMessage: 'Dashboard',
        }
      )}
      singleSelection={{ asPlainText: true }}
      options={serviceDashboards.map(
        ({ dashboardSavedObjectId, dashboardTitle }) => {
          return { label: dashboardTitle, value: dashboardSavedObjectId };
        }
      )}
      selectedOptions={
        currentDashboard
          ? [
              {
                value: currentDashboard?.dashboardSavedObjectId,
                label: currentDashboard?.dashboardTitle,
              },
            ]
          : []
      }
      onChange={([newItem]) => handleOnChange(newItem.value)}
      isClearable={false}
    />
  );
}
