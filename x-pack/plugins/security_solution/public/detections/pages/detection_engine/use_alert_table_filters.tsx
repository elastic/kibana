/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import {
  updateShowThreatIndicatorAlertsFilter,
  updateShowBuildingBlockAlertsFilter,
} from '../../../common/store/data_table/actions';
import { tableDefaults } from '../../../common/store/data_table/defaults';
import { TableId } from '../../../../common/types';
import { dataTableSelectors } from '../../../common/store/data_table';

export const useDataTableFilters = (tableId: TableId) => {
  const dispatch = useDispatch();

  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

  const { showOnlyThreatIndicatorAlerts, showBuildingBlockAlerts } = useShallowEqualSelector(
    (state) =>
      (getTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults).additionalFilters ??
      tableDefaults.additionalFilters
  );

  const setShowBuildingBlockAlerts = useCallback(
    (value: boolean) => {
      dispatch(
        updateShowBuildingBlockAlertsFilter({
          id: tableId,
          showBuildingBlockAlerts: value,
        })
      );
    },
    [dispatch, tableId]
  );

  const setShowOnlyThreatIndicatorAlerts = useCallback(
    (value: boolean) => {
      dispatch(
        updateShowThreatIndicatorAlertsFilter({
          id: tableId,
          showOnlyThreatIndicatorAlerts: value,
        })
      );
    },
    [dispatch, tableId]
  );

  return {
    showBuildingBlockAlerts,
    setShowBuildingBlockAlerts,
    showOnlyThreatIndicatorAlerts,
    setShowOnlyThreatIndicatorAlerts,
  };
};
