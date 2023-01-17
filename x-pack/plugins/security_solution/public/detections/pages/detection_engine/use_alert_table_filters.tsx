/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import {
  showBuildingBlockAlertsSelector,
  showOnlyThreatIndicatorAlertsSelector,
} from '../../../common/store/alert_table/selectors';
import {
  updateShowBuildingBlockAlertsFilter,
  updateShowThreatIndicatorAlertsFilter,
} from '../../../common/store/alert_table/actions';

export const useAlertTableFilters = () => {
  const dispatch = useDispatch();

  const getShowBuildingBlockAlerts = showBuildingBlockAlertsSelector();
  const showBuildingBlockAlerts = useShallowEqualSelector((state) =>
    getShowBuildingBlockAlerts(state)
  );

  const getShowOnlyThreatIndicatorAlerts = showOnlyThreatIndicatorAlertsSelector();
  const showOnlyThreatIndicatorAlerts = useShallowEqualSelector((state) =>
    getShowOnlyThreatIndicatorAlerts(state)
  );

  const setShowBuildingBlockAlerts = useCallback(
    (value: boolean) => {
      dispatch(
        updateShowBuildingBlockAlertsFilter({
          showBuildingBlockAlerts: value,
        })
      );
    },
    [dispatch]
  );

  const setShowOnlyThreatIndicatorAlerts = useCallback(
    (value: boolean) => {
      dispatch(
        updateShowThreatIndicatorAlertsFilter({
          showOnlyThreatIndicatorAlerts: value,
        })
      );
    },
    [dispatch]
  );

  return {
    showBuildingBlockAlerts,
    setShowBuildingBlockAlerts,
    showOnlyThreatIndicatorAlerts,
    setShowOnlyThreatIndicatorAlerts,
  };
};
