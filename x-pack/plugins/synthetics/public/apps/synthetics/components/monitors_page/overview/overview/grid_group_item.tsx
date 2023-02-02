/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTablePagination,
} from '@elastic/eui';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useKey } from 'react-use';
import { MonitorOverviewItem } from '../types';
import { FlyoutParamProps, OverviewGridItem } from './overview_grid_item';
import { selectOverviewStatus } from '../../../../state/overview_status';

const PER_ROW = 4;
const DEFAULT_ROW_SIZE = 2;

export const GroupGridItem = ({
  loaded,
  downMonitorsCount,
  groupLabel,
  fullScreenGroup,
  setFullScreenGroup,
  groupMonitors,
  setFlyoutConfigCallback,
}: {
  loaded: boolean;
  groupMonitors: MonitorOverviewItem[];
  downMonitorsCount: number;
  groupLabel: string;
  fullScreenGroup: string;
  setFullScreenGroup: (group: string) => void;
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const totalEntries = groupMonitors.length / PER_ROW;
  const [activePage, setActivePage] = useState(0);
  const [rowSize, setRowSize] = useState(DEFAULT_ROW_SIZE);

  const visibleMonitors = groupMonitors.slice(
    activePage * rowSize * PER_ROW,
    (activePage + 1) * rowSize * PER_ROW
  );

  const goToPage = (pageNumber: number) => setActivePage(pageNumber);
  const changeItemsPerPage = (pageSize: number) => {
    setRowSize(pageSize);
    setActivePage(0);
  };

  const { status } = useSelector(selectOverviewStatus);

  useKey('Escape', () => {
    if (fullScreenGroup === groupLabel) {
      setFullScreenGroup('');
    }
  });

  return (
    <EuiAccordion
      initialIsOpen={fullScreenGroup === groupLabel}
      isDisabled={fullScreenGroup === groupLabel}
      id={'groupAccordion' + groupLabel}
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem className="eui-textNoWrap">{groupLabel}</EuiFlexItem>
          {downMonitorsCount > 0 && (
            <EuiFlexItem className="eui-textNoWrap">
              <EuiNotificationBadge color="accent">{downMonitorsCount}</EuiNotificationBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      extraAction={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiButtonIcon
              className="fullScreenButton"
              iconType="fullScreen"
              aria-label="Full screen"
              onClick={() => {
                if (fullScreenGroup) {
                  setFullScreenGroup('');
                  document.exitFullscreen();
                } else {
                  document.documentElement.requestFullscreen();
                  setFullScreenGroup(groupLabel);
                }
              }}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiBadge color="subdued">{groupMonitors.length} Monitors</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      isLoading={!loaded || !status}
    >
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={4} gutterSize="m" data-test-subj="syntheticsOverviewGridItemContainer">
        {visibleMonitors.map((monitor) => (
          <EuiFlexItem
            key={`${monitor.id}-${monitor.location?.id}`}
            data-test-subj="syntheticsOverviewGridItem"
          >
            <OverviewGridItem monitor={monitor} onClick={setFlyoutConfigCallback} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      <EuiTablePagination
        aria-label="Monitor grid pagination"
        pageCount={Math.ceil(totalEntries / rowSize)}
        activePage={activePage}
        onChangePage={goToPage}
        itemsPerPage={rowSize}
        onChangeItemsPerPage={changeItemsPerPage}
        itemsPerPageOptions={[2, 5, 10, 20, 50]}
      />
    </EuiAccordion>
  );
};
