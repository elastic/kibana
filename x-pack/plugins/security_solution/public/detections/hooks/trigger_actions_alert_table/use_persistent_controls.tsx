/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { TableId } from '../../../../common/types';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { changeAlertTableViewMode } from '../../../common/store/alert_table/actions';
import { RightTopMenu } from '../../../common/components/events_viewer/right_top_menu';
import { ALERTS_TABLE_VIEW_SELECTION_KEY } from '../../../common/components/events_viewer/summary_view_select';
import { alertTableViewModeSelector } from '../../../common/store/alert_table/selectors';
import { useAlertTableFilters } from '../../pages/detection_engine/use_alert_table_filters';
import { AdditionalFiltersAction } from '../../components/alerts_table/additional_filters_action';
import type { ViewSelection } from '../../../common/components/events_viewer/summary_view_select';

export const getPersistentControlsHook = (storage: Storage) => {
  const usePersistentControls = () => {
    const dispatch = useDispatch();

    const getViewMode = alertTableViewModeSelector();

    const storedTableView = storage.get(ALERTS_TABLE_VIEW_SELECTION_KEY);

    const stateTableView = useShallowEqualSelector((state) => getViewMode(state));

    const tableView = storedTableView ?? stateTableView;

    const handleChangeTableView = useCallback(
      (selectedView: ViewSelection) => {
        dispatch(
          changeAlertTableViewMode({
            viewMode: selectedView,
          })
        );
      },
      [dispatch]
    );

    const {
      showBuildingBlockAlerts,
      setShowBuildingBlockAlerts,
      showOnlyThreatIndicatorAlerts,
      setShowOnlyThreatIndicatorAlerts,
    } = useAlertTableFilters();

    const additionalFiltersComponent = useMemo(
      () => (
        <AdditionalFiltersAction
          areEventsLoading={false}
          onShowBuildingBlockAlertsChanged={setShowBuildingBlockAlerts}
          showBuildingBlockAlerts={showBuildingBlockAlerts}
          onShowOnlyThreatIndicatorAlertsChanged={setShowOnlyThreatIndicatorAlerts}
          showOnlyThreatIndicatorAlerts={showOnlyThreatIndicatorAlerts}
        />
      ),
      [
        showBuildingBlockAlerts,
        setShowBuildingBlockAlerts,
        showOnlyThreatIndicatorAlerts,
        setShowOnlyThreatIndicatorAlerts,
      ]
    );

    return {
      right: (
        <RightTopMenu
          tableView={tableView}
          loading={false}
          tableId={TableId.alertsOnAlertsPage}
          title={'Some Title'}
          onViewChange={handleChangeTableView}
          hasRightOffset={false}
          additionalFilters={additionalFiltersComponent}
        />
      ),
    };
  };

  return usePersistentControls;
};
