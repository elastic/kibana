/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexItem,
  EuiFlexGrid,
  EuiSpacer,
  EuiTablePagination,
  EuiFlexGroup,
} from '@elastic/eui';
import {
  quietFetchOverviewAction,
  selectOverviewState,
  setFlyoutConfig,
  setOverviewPerPageAction,
} from '../../../../state/overview';
import { OverviewPaginationInfo } from './overview_pagination_info';
import { OverviewGridItem } from './overview_grid_item';
import { MonitorDetailFlyout } from './monitor_detail_flyout';
import { OverviewStatus } from './overview_status';

export const OverviewGrid = () => {
  const {
    data: { pages },
    flyoutConfig,
    loaded,
    pageState,
    pageState: { perPage },
  } = useSelector(selectOverviewState);
  const dispatch = useDispatch();
  const [page, setPage] = useState(0);
  const currentMonitors = pages[page] || [];
  const setFlyoutConfigCallback = useCallback(
    (monitorId: string, location: string) => dispatch(setFlyoutConfig({ monitorId, location })),
    [dispatch]
  );
  const hideFlyout = useCallback(() => dispatch(setFlyoutConfig(null)), [dispatch]);
  const forceRefreshCallback = useCallback(
    () => dispatch(quietFetchOverviewAction.get(pageState)),
    [dispatch, pageState]
  );

  const goToPage = (pageNumber: number) => {
    setPage(pageNumber);
  };

  const changeItemsPerPage = (itemsPerPage: number) => {
    dispatch(setOverviewPerPageAction(itemsPerPage));
  };

  return loaded ? (
    <>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>
          <OverviewStatus />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <OverviewPaginationInfo page={page} />
      <EuiSpacer />
      <EuiFlexGrid columns={4}>
        {currentMonitors.map((monitor) => (
          <EuiFlexItem
            key={`${monitor.id}-${monitor.location?.id}`}
            data-test-subj="syntheticsOverviewGridItem"
          >
            <OverviewGridItem monitor={monitor} onClick={setFlyoutConfigCallback} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiTablePagination
        aria-label={i18n.translate('xpack.synthetics.overview.pagination.ariaLabel', {
          defaultMessage: 'Pagination for monitor overview',
        })}
        pageCount={Object.keys(pages).length}
        activePage={page}
        onChangePage={goToPage}
        itemsPerPage={perPage}
        onChangeItemsPerPage={changeItemsPerPage}
        itemsPerPageOptions={[10, 20, 40]}
      />
      {flyoutConfig?.monitorId && flyoutConfig?.location && (
        <MonitorDetailFlyout
          id={flyoutConfig.monitorId}
          location={flyoutConfig.location}
          onClose={hideFlyout}
          onEnabledChange={forceRefreshCallback}
          onLocationChange={setFlyoutConfigCallback}
        />
      )}
    </>
  ) : null;
};
