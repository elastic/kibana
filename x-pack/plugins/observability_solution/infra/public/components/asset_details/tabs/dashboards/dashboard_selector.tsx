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
import { fromQuery, toQuery } from '../../shared/links/url_helpers';
import { DashboardItemWithTitle } from '../../../../../common/custom_dashboards';

interface Props {
  customDashboards: DashboardItemWithTitle[];
  currentDashboardId?: string;
  setCurrentDashboard: (newDashboard: DashboardItemWithTitle) => void;
}

export function DashboardSelector({
  customDashboards,
  currentDashboardId,
  setCurrentDashboard,
}: Props) {
  const history = useHistory();

  const [selectedDashboard, setSelectedDashboard] = useState<DashboardItemWithTitle>();

  // TODO dashboardId URL param
  // useMount(() => {
  //   if (!currentDashboardId) {
  //     history.push({
  //       ...history.location,
  //       search: fromQuery({
  //         ...toQuery(location.search),
  //         dashboardId: customDashboards[0].id,
  //       }),
  //     });
  //   }
  // });

  useEffect(() => {
    const preselectedDashboard = customDashboards.find(
      ({ id }) => id === currentDashboardId || 'system-Metrics-system-overview'
    );
    console.log('preselectedDashboard', preselectedDashboard);
    console.log('customDashboards', customDashboards);
    console.log('currentDashboardId', currentDashboardId);
    // preselect dashboard
    if (preselectedDashboard) {
      setSelectedDashboard(preselectedDashboard);
      setCurrentDashboard(preselectedDashboard);
    }
  }, [customDashboards, currentDashboardId, setCurrentDashboard]);

  function onChange(newDashboardId?: string) {
    // TODO FIX
    // history.push({
    //   ...history.location,
    //   search: fromQuery({
    //     ...toQuery(location.search),
    //     dashboardId: newDashboardId,
    //   }),
    // });
    // }
  }

  return (
    <EuiComboBox
      compressed
      style={{ minWidth: '200px' }}
      placeholder={i18n.translate('xpack.infra.customDashboards.selectDashboard.placeholder', {
        defaultMessage: 'Select dashboard',
      })}
      prepend={i18n.translate('xpack.infra.customDashboards.selectDashboard.prepend', {
        defaultMessage: 'Dashboard',
      })}
      singleSelection={{ asPlainText: true }}
      options={customDashboards.map(({ id, title }) => {
        return {
          label: title,
          value: id,
        };
      })}
      selectedOptions={
        selectedDashboard
          ? [
              {
                value: selectedDashboard?.id,
                label: selectedDashboard?.title,
              },
            ]
          : []
      }
      onChange={([newItem]) => onChange(newItem.value)}
      isClearable={false}
    />
  );
}
