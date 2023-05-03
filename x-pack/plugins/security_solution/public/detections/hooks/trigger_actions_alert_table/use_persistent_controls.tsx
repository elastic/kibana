/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  dataTableSelectors,
  tableDefaults,
  dataTableActions,
} from '@kbn/securitysolution-data-table';
import type { ViewSelection, TableId } from '@kbn/securitysolution-data-table';
import type { State } from '../../../common/store';
import { useDataTableFilters } from '../../../common/hooks/use_data_table_filters';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { RightTopMenu } from '../../../common/components/events_viewer/right_top_menu';
import { AdditionalFiltersAction } from '../../components/alerts_table/additional_filters_action';
import { groupSelectors } from '../../../common/store/grouping';

const { changeViewMode } = dataTableActions;

export const getPersistentControlsHook = (tableId: TableId) => {
  const usePersistentControls = () => {
    const dispatch = useDispatch();
    const getGroupSelector = groupSelectors.getGroupSelector();

    const groupSelector = useSelector((state: State) => getGroupSelector(state));

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

    const rightTopMenu = useMemo(
      () => (
        <RightTopMenu
          position="relative"
          tableView={tableView}
          loading={false}
          tableId={tableId}
          title={'Some Title'}
          onViewChange={handleChangeTableView}
          hasRightOffset={false}
          additionalFilters={additionalFiltersComponent}
          showInspect={false}
          additionalMenuOptions={groupSelector != null ? [groupSelector] : []}
        />
      ),
      [tableView, handleChangeTableView, additionalFiltersComponent, groupSelector]
    );

    return {
      right: rightTopMenu,
    };
  };

  return usePersistentControls;
};
