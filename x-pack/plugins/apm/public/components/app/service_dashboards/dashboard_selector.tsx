/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MergedServiceDashboard } from '.';
import { fromQuery, toQuery } from '../../shared/links/url_helpers';

interface Props {
  serviceDashboards: MergedServiceDashboard[];
  currentDashboard?: MergedServiceDashboard;
}

export function DashboardSelector({
  serviceDashboards,
  currentDashboard,
}: Props) {
  const history = useHistory();

  function onChange(newDashboardId?: string) {
    history.push({
      ...history.location,
      search: fromQuery({
        ...toQuery(location.search),
        dashboardId: newDashboardId,
      }),
    });
  }

  return (
    <EuiComboBox
      compressed
      style={{ minWidth: '200px' }}
      placeholder={i18n.translate(
        'xpack.apm.serviceDashboards.selectDashboard.placeholder',
        {
          defaultMessage: 'Select dashboard',
        }
      )}
      prepend={i18n.translate(
        'xpack.apm.serviceDashboards.selectDashboard.prepend',
        {
          defaultMessage: 'Dashboard',
        }
      )}
      singleSelection={{ asPlainText: true }}
      options={serviceDashboards.map(({ dashboardSavedObjectId, title }) => {
        return {
          label: title,
          value: dashboardSavedObjectId,
        };
      })}
      selectedOptions={
        currentDashboard
          ? [
              {
                value: currentDashboard?.dashboardSavedObjectId,
                label: currentDashboard?.title,
              },
            ]
          : []
      }
      onChange={([newItem]) => onChange(newItem.value)}
      isClearable={false}
    />
  );
}
