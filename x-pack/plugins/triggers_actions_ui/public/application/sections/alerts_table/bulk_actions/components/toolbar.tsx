/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiButtonEmpty, EuiContextMenuPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useState, useCallback, useMemo, useContext, useEffect } from 'react';
// import styled from 'styled-components';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import * as i18n from '../translations';
import { SelectionContext } from '../context';

interface BulkActionsProps {
  totalItems: number;
  selectedCount: number;
  bulkActionItems?: JSX.Element[];
}

// const BulkActionsContainer = styled.div`
//   display: inline-block;
//   position: relative;
// `;

// BulkActionsContainer.displayName = 'BulkActionsContainer';

const DEFAULT_NUMBER_FORMAT = 'format:number:defaultPattern';

const BulkActionsComponent: React.FC<BulkActionsProps> = ({ totalItems, bulkActionItems }) => {
  const [{ rowSelection, isAllSelected }, updateSelectedRows] = useContext(SelectionContext);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const [showClearSelection, setShowClearSelectiong] = useState(false);

  useEffect(() => {
    console.log('isAllSelected', isAllSelected);
    setShowClearSelectiong(isAllSelected);
  }, [isAllSelected]);

  const selectedCount = rowSelection.size;
  console.log('selectedCount', selectedCount);

  const formattedTotalCount = useMemo(
    () => numeral(totalItems).format(defaultNumberFormat),
    [defaultNumberFormat, totalItems]
  );
  const formattedSelectedEventsCount = useMemo(() => {
    console.log('executing the memoized fn', selectedCount);
    return numeral(selectedCount).format(defaultNumberFormat);
  }, [defaultNumberFormat, selectedCount]);

  const toggleIsActionOpen = useCallback(() => {
    setIsActionsPopoverOpen((currentIsOpen) => !currentIsOpen);
  }, [setIsActionsPopoverOpen]);

  const closeActionPopover = useCallback(() => {
    setIsActionsPopoverOpen(false);
  }, [setIsActionsPopoverOpen]);

  const closeIfPopoverIsOpen = useCallback(() => {
    if (isActionsPopoverOpen) {
      setIsActionsPopoverOpen(false);
    }
  }, [isActionsPopoverOpen]);

  const toggleSelectAll = useCallback(() => {
    if (!showClearSelection) {
      updateSelectedRows({ action: 'selectAll' });
    } else {
      updateSelectedRows({ action: 'clear' });
    }
  }, [showClearSelection, updateSelectedRows]);

  const selectedAlertsText = useMemo(() => {
    console.log(formattedSelectedEventsCount, totalItems);
    return showClearSelection
      ? i18n.SELECTED_ALERTS(formattedTotalCount, totalItems)
      : i18n.SELECTED_ALERTS(formattedSelectedEventsCount, selectedCount);
  }, [
    showClearSelection,
    formattedTotalCount,
    formattedSelectedEventsCount,
    totalItems,
    selectedCount,
  ]);

  const selectClearAllAlertsText = useMemo(
    () =>
      showClearSelection
        ? i18n.CLEAR_SELECTION
        : i18n.SELECT_ALL_ALERTS(formattedTotalCount, totalItems),
    [showClearSelection, formattedTotalCount, totalItems]
  );

  return (
    <div
      style={{ display: 'inline-block', position: 'relative' }}
      onClick={closeIfPopoverIsOpen}
      data-test-subj="bulk-actions-button-container"
    >
      <EuiPopover
        isOpen={isActionsPopoverOpen}
        anchorPosition="upCenter"
        panelPaddingSize="none"
        button={
          <EuiButtonEmpty
            aria-label="selectedShowBulkActions"
            data-test-subj="selectedShowBulkActionsButton"
            size="xs"
            iconType="arrowDown"
            iconSide="right"
            color="primary"
            onClick={toggleIsActionOpen}
          >
            {selectedAlertsText}
          </EuiButtonEmpty>
        }
        closePopover={closeActionPopover}
      >
        <EuiContextMenuPanel size="s" items={bulkActionItems} />
      </EuiPopover>

      <EuiButtonEmpty
        size="xs"
        aria-label="selectAllAlerts"
        data-test-subj="selectAllAlertsButton"
        iconType={showClearSelection ? 'cross' : 'pagesSelect'}
        onClick={toggleSelectAll}
      >
        {selectClearAllAlertsText}
      </EuiButtonEmpty>
    </div>
  );
};

export const BulkActions = React.memo(BulkActionsComponent);
