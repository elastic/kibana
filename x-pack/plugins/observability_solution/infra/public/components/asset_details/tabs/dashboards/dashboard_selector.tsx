/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import useMount from 'react-use/lib/useMount';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DashboardItemWithTitle } from '../../../../../common/custom_dashboards';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';

interface Props {
  customDashboards: DashboardItemWithTitle[];
  currentDashboardId?: string;
  setCurrentDashboard: (newDashboard: DashboardItemWithTitle) => void;
  onRefresh: () => void;
}

export function DashboardSelector({
  customDashboards,
  currentDashboardId,
  setCurrentDashboard,
  onRefresh,
}: Props) {
  const [, setUrlState] = useAssetDetailsUrlState();

  const [selectedDashboard, setSelectedDashboard] = useState<DashboardItemWithTitle>();

  useMount(() => {
    if (!currentDashboardId) {
      setUrlState({ dashboardId: customDashboards[0]?.dashboardSavedObjectId });
    }
  });

  useEffect(() => {
    const preselectedDashboard = customDashboards.find(
      ({ dashboardSavedObjectId }) => dashboardSavedObjectId === currentDashboardId
    );
    // preselect dashboard
    if (preselectedDashboard) {
      setSelectedDashboard(preselectedDashboard);
      setCurrentDashboard(preselectedDashboard);
    }
  }, [customDashboards, currentDashboardId, setCurrentDashboard]);

  function onChange(newDashboardId?: string) {
    setUrlState({ dashboardId: newDashboardId });
    onRefresh();
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
      options={customDashboards.map(({ dashboardSavedObjectId, title }) => {
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
