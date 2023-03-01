/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isNoneGroup } from '@kbn/securitysolution-grouping';
import { useGetGroupSelector } from '../../../common/containers/grouping/hooks/use_get_group_selector';
import { defaultGroup } from '../../../common/store/grouping/defaults';
import type { State } from '../../../common/store';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useDataTableFilters } from '../../../common/hooks/use_data_table_filters';
import { dataTableSelectors } from '../../../common/store/data_table';
import { changeViewMode } from '../../../common/store/data_table/actions';
import type { ViewSelection, TableId } from '../../../../common/types';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { RightTopMenu } from '../../../common/components/events_viewer/right_top_menu';
import { AdditionalFiltersAction } from '../../components/alerts_table/additional_filters_action';
import { tableDefaults } from '../../../common/store/data_table/defaults';
import { groupSelectors } from '../../../common/store/grouping';

export const getPersistentControlsHook = (tableId: TableId) => {
  const usePersistentControls = () => {
    const dispatch = useDispatch();
    const getGroupbyIdSelector = groupSelectors.getGroupByIdSelector();

    const { activeGroup: selectedGroup } =
      useSelector((state: State) => getGroupbyIdSelector(state, tableId)) ?? defaultGroup;

    const { indexPattern: indexPatterns } = useSourcererDataView(SourcererScopeName.detections);

    const groupsSelector = useGetGroupSelector({
      fields: indexPatterns.fields,
      groupingId: tableId,
      tableId,
    });

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
          additionalMenuOptions={isNoneGroup(selectedGroup) ? [groupsSelector] : []}
        />
      ),
      [tableView, handleChangeTableView, additionalFiltersComponent, groupsSelector, selectedGroup]
    );

    return {
      right: rightTopMenu,
    };
  };

  return usePersistentControls;
};
