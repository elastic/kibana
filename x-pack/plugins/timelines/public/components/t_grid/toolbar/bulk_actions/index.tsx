/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiButtonEmpty, EuiContextMenuPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import * as i18n from './translations';

interface BulkActionsProps {
  totalItems: number;
  selectedCount: number;
  showClearSelection: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  bulkActionItems?: JSX.Element[];
}

const BulkActionsContainer = styled.div`
  display: inline-block;
  position: relative;
`;

BulkActionsContainer.displayName = 'BulkActionsContainer';

/**
 * Stateless component integrating the bulk actions menu and the select all button
 */
const BulkActionsComponent: React.FC<BulkActionsProps> = ({
  selectedCount,
  totalItems,
  showClearSelection,
  onSelectAll,
  onClearSelection,
  bulkActionItems,
}) => {
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const formattedTotalCount = useMemo(
    () => numeral(totalItems).format(defaultNumberFormat),
    [defaultNumberFormat, totalItems]
  );
  const formattedSelectedEventsCount = useMemo(
    () => numeral(selectedCount).format(defaultNumberFormat),
    [defaultNumberFormat, selectedCount]
  );

  const toggleIsActionOpen = useCallback(() => {
    setIsActionsPopoverOpen((currentIsOpen) => !currentIsOpen);
  }, [setIsActionsPopoverOpen]);

  const closeActionPopover = useCallback(() => {
    setIsActionsPopoverOpen(false);
  }, [setIsActionsPopoverOpen]);

  const toggleSelectAll = useCallback(() => {
    if (!showClearSelection) {
      onSelectAll();
    } else {
      onClearSelection();
    }
  }, [onClearSelection, onSelectAll, showClearSelection]);

  const selectedAlertsText = useMemo(
    () =>
      showClearSelection
        ? i18n.SELECTED_ALERTS(formattedTotalCount, totalItems)
        : i18n.SELECTED_ALERTS(formattedSelectedEventsCount, selectedCount),
    [
      showClearSelection,
      formattedTotalCount,
      formattedSelectedEventsCount,
      totalItems,
      selectedCount,
    ]
  );

  const selectClearAllAlertsText = useMemo(
    () =>
      showClearSelection
        ? i18n.CLEAR_SELECTION
        : i18n.SELECT_ALL_ALERTS(formattedTotalCount, totalItems),
    [showClearSelection, formattedTotalCount, totalItems]
  );

  return (
    <BulkActionsContainer data-test-subj="bulk-actions-button-container">
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
    </BulkActionsContainer>
  );
};

export const BulkActions = React.memo(BulkActionsComponent);
