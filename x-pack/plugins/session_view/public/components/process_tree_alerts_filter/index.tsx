/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiPopover,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { DEFAULT_ALERT_FILTER_VALUE } from '../../../common/constants';
import {
  ProcessEventAlertCategory,
  DefaultAlertFilterType,
  AlertTypeCount,
} from '../../../common/types/process_tree';
import { useStyles } from './styles';

export interface ProcessTreeAlertsFilterDeps {
  totalAlertsCount: number;
  alertTypeCounts: AlertTypeCount[];
  filteredAlertsCount: number;
  onAlertEventCategorySelected: (value: ProcessEventAlertCategory | DefaultAlertFilterType) => void;
}

export const ProcessTreeAlertsFilter = ({
  totalAlertsCount,
  alertTypeCounts,
  filteredAlertsCount,
  onAlertEventCategorySelected,
}: ProcessTreeAlertsFilterDeps) => {
  const { filterStatus, popover } = useStyles();

  const [selectedProcessEventAlertCategory, setSelectedProcessEventAlertCategory] = useState<
    ProcessEventAlertCategory | DefaultAlertFilterType
  >(DEFAULT_ALERT_FILTER_VALUE);

  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const onSelectedProcessEventAlertCategory = useCallback(
    (event) => {
      const [_, selectedAlertEvent] = event.target.textContent.split(' ');
      setSelectedProcessEventAlertCategory(selectedAlertEvent);
      onAlertEventCategorySelected(selectedAlertEvent);
      closePopover();
    },
    [onAlertEventCategorySelected]
  );

  const alertCountsStatusText = useMemo(() => {
    return totalAlertsCount === filteredAlertsCount
      ? totalAlertsCount
      : `${filteredAlertsCount} of ${totalAlertsCount}`;
  }, [totalAlertsCount, filteredAlertsCount]);

  const doesMultipleAlertTypesExist = useMemo(() => {
    // Check if alerts consist of at least two alert event types
    const multipleAlertTypeCount = alertTypeCounts.reduce((sumOfAlertTypes, { count }) => {
      if (count > 0) {
        return (sumOfAlertTypes += 1);
      }
      return 0;
    }, 0);
    return multipleAlertTypeCount > 1;
  }, [alertTypeCounts]);

  const alertEventCategoryFilterMenuButton = (
    <EuiButtonEmpty
      data-test-subj="sessionView:sessionViewAlertDetailsEmptyFilterButton"
      size="s"
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
    >
      <EuiText size="s">View: {selectedProcessEventAlertCategory} alerts </EuiText>
    </EuiButtonEmpty>
  );

  const alertEventCategoryFilterMenuItems = useMemo(() => {
    const getIconType = (eventCategory: ProcessEventAlertCategory | DefaultAlertFilterType) => {
      return eventCategory === selectedProcessEventAlertCategory ? 'check' : 'empty';
    };

    const alertEventFilterMenuItems = alertTypeCounts
      .filter(({ count }) => count > 0)
      .map(({ category: processEventAlertCategory }) => {
        return (
          <EuiContextMenuItem
            data-test-subj={`sessionView:sessionViewAlertDetailsFilterItem-${processEventAlertCategory}`}
            key={processEventAlertCategory}
            icon={getIconType(processEventAlertCategory)}
            onClick={onSelectedProcessEventAlertCategory}
          >
            View {processEventAlertCategory} alerts
          </EuiContextMenuItem>
        );
      });

    return [
      <EuiContextMenuItem
        data-test-subj={`sessionView:sessionViewAlertDetailsFilterItem-default`}
        key={DEFAULT_ALERT_FILTER_VALUE}
        icon={getIconType(DEFAULT_ALERT_FILTER_VALUE)}
        onClick={onSelectedProcessEventAlertCategory}
      >
        View {DEFAULT_ALERT_FILTER_VALUE} alerts
      </EuiContextMenuItem>,
      ...alertEventFilterMenuItems,
    ];
  }, [selectedProcessEventAlertCategory, alertTypeCounts, onSelectedProcessEventAlertCategory]);

  return (
    <div data-test-subj="sessionView:sessionViewAlertDetailsFilter">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem css={filterStatus} style={{ paddingLeft: '16px' }}>
          <EuiText size="s">
            Showing{' '}
            <span
              className={'text'}
              data-test-subj="sessionView:sessionViewAlertDetailsFilterStatus"
            >
              {alertCountsStatusText}
            </span>{' '}
            alerts
          </EuiText>
        </EuiFlexItem>
        {doesMultipleAlertTypesExist && (
          <EuiFlexItem
            css={popover}
            grow={false}
            data-test-subj="sessionView:sessionViewAlertDetailsFilterSelectorContainer"
          >
            <EuiPopover
              button={alertEventCategoryFilterMenuButton}
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <EuiContextMenuPanel
                data-test-subj="sessionView:sessionViewAlertDetailsFilterSelectorContainerMenu"
                size="s"
                className={'filterMenu'}
                items={alertEventCategoryFilterMenuItems}
              />
            </EuiPopover>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
    </div>
  );
};
