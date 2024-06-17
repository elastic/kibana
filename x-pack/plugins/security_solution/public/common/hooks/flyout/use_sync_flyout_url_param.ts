/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  dataTableActions,
  dataTableSelectors,
  tableDefaults,
  TableId,
} from '@kbn/securitysolution-data-table';
import { useIsExperimentalFeatureEnabled } from '../use_experimental_features';
import { ALERTS_PATH } from '../../../../common/constants';
import { useUpdateUrlParam } from '../../utils/global_query_string';
import { useShallowEqualSelector } from '../use_selector';
import { URL_PARAM_KEY } from '../use_url_state';
import type { FlyoutUrlState } from './types';

/**
 * The state of the old flyout of the table in the Alerts page is stored in local storage.
 * This hook was created to sync the data stored in local storage to the url.
 * This is only be needed with the old flyout.
 * // TODO remove this hook entirely when we delete the old flyout code
 */
export const useSyncFlyoutUrlParam = () => {
  const expandableFlyoutDisabled = useIsExperimentalFeatureEnabled('expandableFlyoutDisabled');
  const updateUrlParam = useUpdateUrlParam<FlyoutUrlState>(URL_PARAM_KEY.flyout);
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const getDataTable = dataTableSelectors.getTableByIdSelector();

  // Only allow the alerts page for now to be saved in the url state
  const { expandedDetail } = useShallowEqualSelector(
    (state) => getDataTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults
  );

  useEffect(() => {
    if (!expandableFlyoutDisabled) return;

    const isOnAlertsPage = pathname === ALERTS_PATH;
    if (isOnAlertsPage && expandedDetail != null && expandedDetail?.query) {
      updateUrlParam(expandedDetail.query.panelView ? expandedDetail.query : null);
    } else if (!isOnAlertsPage && expandedDetail?.query?.panelView) {
      // Close the detail panel as it's stored in a top level redux store maintained across views
      dispatch(
        dataTableActions.toggleDetailPanel({
          id: TableId.alertsOnAlertsPage,
        })
      );
      // Clear the reference from the url
      updateUrlParam(null);
    }
  }, [dispatch, expandedDetail, expandableFlyoutDisabled, pathname, updateUrlParam]);
};
