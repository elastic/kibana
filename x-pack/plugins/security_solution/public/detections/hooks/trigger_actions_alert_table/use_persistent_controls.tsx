/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { dataTableSelectors } from '../../../common/store/data_table';
import { changeViewMode } from '../../../common/store/data_table/actions';
import type { ViewSelection, TableId } from '../../../../common/types';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { RightTopMenu } from '../../../common/components/events_viewer/right_top_menu';
import { useDataTableFilters } from '../../pages/detection_engine/use_alert_table_filters';
import { AdditionalFiltersAction } from '../../components/alerts_table/additional_filters_action';
import { tableDefaults } from '../../../common/store/data_table/defaults';

export const getPersistentControlsHook = (tableId: TableId) => {
  const usePersistentControls = () => {
    const dispatch = useDispatch();

    const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

    const tableView = useShallowEqualSelector(
      (state) => (getTable(state, tableId) ?? tableDefaults).viewMode ?? tableDefaults.viewMode
    );

    const handleChangeTableView = useCallback(
      (selectedView: ViewSelection) => {
        dispatch(
          changeViewMode({
            id: tableId,
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
    } = useDataTableFilters(tableId);

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
          tableId={tableId}
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
