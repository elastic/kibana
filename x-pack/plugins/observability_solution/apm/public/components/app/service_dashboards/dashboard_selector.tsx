/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import useMount from 'react-use/lib/useMount';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MergedServiceDashboard } from '.';
import { fromQuery, toQuery } from '../../shared/links/url_helpers';

interface Props {
  serviceDashboards: MergedServiceDashboard[];
  currentDashboardId?: string;
  setCurrentDashboard: (newDashboard: MergedServiceDashboard) => void;
}

export function DashboardSelector({
  serviceDashboards,
  currentDashboardId,
  setCurrentDashboard,
}: Props) {
  const history = useHistory();

  const [selectedDashboard, setSelectedDashboard] = useState<MergedServiceDashboard>();

  useMount(() => {
    if (!currentDashboardId) {
      history.push({
        ...history.location,
        search: fromQuery({
          ...toQuery(location.search),
          dashboardId: serviceDashboards[0].dashboardSavedObjectId,
        }),
      });
    }
  });

  useEffect(() => {
    const preselectedDashboard = serviceDashboards.find(
      ({ dashboardSavedObjectId }) => dashboardSavedObjectId === currentDashboardId
    );
    // preselect dashboard
    if (preselectedDashboard) {
      setSelectedDashboard(preselectedDashboard);
      setCurrentDashboard(preselectedDashboard);
    }
  }, [serviceDashboards, currentDashboardId, setCurrentDashboard]);

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
      placeholder={i18n.translate('xpack.apm.serviceDashboards.selectDashboard.placeholder', {
        defaultMessage: 'Select dashboard',
      })}
      prepend={i18n.translate('xpack.apm.serviceDashboards.selectDashboard.prepend', {
        defaultMessage: 'Dashboard',
      })}
      singleSelection={{ asPlainText: true }}
      options={serviceDashboards.map(({ dashboardSavedObjectId, title }) => {
        return {
          label: title,
          value: dashboardSavedObjectId,
        };
      })}
      selectedOptions={
        selectedDashboard
          ? [
              {
                value: selectedDashboard.dashboardSavedObjectId,
                label: selectedDashboard.title,
              },
            ]
          : []
      }
      onChange={([newItem]) => onChange(newItem.value)}
      isClearable={false}
    />
  );
}
