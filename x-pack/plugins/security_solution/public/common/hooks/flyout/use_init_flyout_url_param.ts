/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';

import {
  dataTableSelectors,
  TableId,
  tableDefaults,
  dataTableActions,
} from '@kbn/securitysolution-data-table';
import { ENABLE_EXPANDABLE_FLYOUT_SETTING } from '../../../../common/constants';
import { useInitializeUrlParam } from '../../utils/global_query_string';
import { URL_PARAM_KEY } from '../use_url_state';
import type { FlyoutUrlState } from './types';
import { useShallowEqualSelector } from '../use_selector';
import { useUiSetting$ } from '../../lib/kibana';

export const useInitFlyoutFromUrlParam = () => {
  const [isSecurityFlyoutEnabled] = useUiSetting$<boolean>(ENABLE_EXPANDABLE_FLYOUT_SETTING);
  const [urlDetails, setUrlDetails] = useState<FlyoutUrlState | null>(null);
  const [hasLoadedUrlDetails, updateHasLoadedUrlDetails] = useState(false);
  const dispatch = useDispatch();
  const getDataTable = dataTableSelectors.getTableByIdSelector();

  // Only allow the alerts page for now to be saved in the url state.
  // Allowing only one makes the transition to the expanded flyout much easier as well
  const dataTableCurrent = useShallowEqualSelector(
    (state) => getDataTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults
  );

  const onInitialize = useCallback(
    (initialState: FlyoutUrlState | null) => {
      if (!isSecurityFlyoutEnabled && initialState != null && initialState.panelView) {
        setUrlDetails(initialState);
      }
    },
    [isSecurityFlyoutEnabled]
  );

  const loadExpandedDetailFromUrl = useCallback(() => {
    const { initialized, isLoading, totalCount, additionalFilters } = dataTableCurrent;
    const isTableLoaded = initialized && !isLoading && totalCount > 0;
    if (!isSecurityFlyoutEnabled && urlDetails) {
      if (!additionalFilters || !additionalFilters.showBuildingBlockAlerts) {
        // We want to show building block alerts when loading the flyout in case the alert is a building block alert
        dispatch(
          dataTableActions.updateShowBuildingBlockAlertsFilter({
            id: TableId.alertsOnAlertsPage,
            showBuildingBlockAlerts: true,
          })
        );
      }

      if (isTableLoaded) {
        updateHasLoadedUrlDetails(true);
        dispatch(
          dataTableActions.toggleDetailPanel({
            id: TableId.alertsOnAlertsPage,
            ...urlDetails,
          })
        );
      }
    }
  }, [dataTableCurrent, dispatch, isSecurityFlyoutEnabled, urlDetails]);

  // The alert page creates a default dataTable slice in redux initially that is later overriden when data is retrieved
  // We use the below to store the urlDetails on app load, and then set it when the table is done loading and has data
  useEffect(() => {
    if (!hasLoadedUrlDetails) {
      loadExpandedDetailFromUrl();
    }
  }, [hasLoadedUrlDetails, loadExpandedDetailFromUrl]);

  /**
   * The URL_PARAM_KEY.eventFlyout is used for the old flyout as well as the new expandable flyout here:
   * x-pack/plugins/security_solution/public/common/hooks/flyout/use_sync_flyout_url_param.ts
   * We only want this to run for the old flyout.
   */
  const initializeKey = isSecurityFlyoutEnabled ? '' : URL_PARAM_KEY.eventFlyout;
  useInitializeUrlParam(initializeKey, onInitialize);
};
