/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { TableId } from '../../../common/types';
import { dataTableSelectors } from '../store/data_table';
import {
  updateShowBuildingBlockAlertsFilter,
  updateShowThreatIndicatorAlertsFilter,
} from '../store/data_table/actions';
import { tableDefaults } from '../store/data_table/defaults';
import { useShallowEqualSelector } from './use_selector';

export type UseDataTableFilters = (tableId: TableId) => {
  showBuildingBlockAlerts: boolean;
  setShowBuildingBlockAlerts: (value: boolean) => void;
  showOnlyThreatIndicatorAlerts: boolean;
  setShowOnlyThreatIndicatorAlerts: (value: boolean) => void;
};

export const useDataTableFilters: UseDataTableFilters = (tableId: TableId) => {
  const dispatch = useDispatch();

  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

  const { showOnlyThreatIndicatorAlerts, showBuildingBlockAlerts } = useShallowEqualSelector(
    (state) =>
      (getTable(state, tableId) ?? tableDefaults).additionalFilters ??
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
