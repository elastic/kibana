/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MergedServiceDashboard } from '.';
import { fromQuery, toQuery } from '../../shared/links/url_helpers';

interface Props {
  serviceDashboards: MergedServiceDashboard[];
  currentDashboard?: MergedServiceDashboard;
  handleOnChange: (selectedId?: string) => void;
}

export function DashboardSelector({
  serviceDashboards,
  currentDashboard,
  handleOnChange,
}: Props) {
  const history = useHistory();

  useEffect(
    () =>
      history.push({
        ...history.location,
        search: fromQuery({
          ...toQuery(location.search),
          dashboardId: currentDashboard?.id,
        }),
      }),
    // It should only update when loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function onChange(newDashboardId?: string) {
    history.push({
      ...history.location,
      search: fromQuery({
        ...toQuery(location.search),
        dashboardId: newDashboardId,
      }),
    });
    handleOnChange(newDashboardId);
  }
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
