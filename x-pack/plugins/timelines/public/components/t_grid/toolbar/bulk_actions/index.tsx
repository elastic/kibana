/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiButtonEmpty, EuiPopoverTitle, EuiContextMenuPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import * as i18n from './translations';

export interface BulkActionsProps {
  timelineId: string;
  totalItems: number;
  selectedCount: number;
  showClearSelection: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  bulkActionItems?: JSX.Element[];
}

const BulkActionsButtonContainer = styled.div`
  display: inline-block;
  position: relative;
`;

BulkActionsButtonContainer.displayName = 'BulkActionsButtonContainer';

/**
 * Manages the state of the bulk actions
 */
export const BulkActionsComponent: React.FC<BulkActionsProps> = ({
  selectedCount,
  totalItems,
  showClearSelection,
  onSelectAll,
  onClearSelection,
  bulkActionItems,
}) => {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const formattedTotalCount = numeral(totalItems).format(defaultNumberFormat);
  const formattedSelectedEventsCount = numeral(selectedCount).format(defaultNumberFormat);

  const selectedAlertsText = useMemo(
    () =>
      i18n.SELECTED_ALERTS(
        showClearSelection ? formattedTotalCount : formattedSelectedEventsCount,
        showClearSelection ? totalItems : selectedCount
      ),
    [
      formattedSelectedEventsCount,
      formattedTotalCount,
      showClearSelection,
      selectedCount,
      totalItems,
    ]
  );

  const onToggleSelectAll = useCallback(() => {
    if (!showClearSelection) {
      onSelectAll();
    } else {
      onClearSelection();
    }
  }, [onClearSelection, onSelectAll, showClearSelection]);

  return (
    <BulkActionsButtonContainer data-test-subj="bulk-actions-button-container">
      <EuiPopover
        isOpen={isActionsOpen}
        anchorPosition="upCenter"
        panelPaddingSize="s"
        button={
          <EuiButtonEmpty
            aria-label="selectedShowBulkActions"
            data-test-subj="selectedShowBulkActionsButton"
            size="xs"
            iconType="arrowDown"
            iconSide="right"
            color="primary"
            onClick={() => setIsActionsOpen(!isActionsOpen)}
          >
            {selectedAlertsText}
          </EuiButtonEmpty>
        }
        closePopover={() => setIsActionsOpen(false)}
      >
        <EuiPopoverTitle>{selectedAlertsText}</EuiPopoverTitle>
        <EuiContextMenuPanel size="s" items={bulkActionItems} />
      </EuiPopover>

      <EuiButtonEmpty
        size="xs"
        aria-label="selectAllAlerts"
        data-test-subj="selectAllAlertsButton"
        iconType={showClearSelection ? 'cross' : 'pagesSelect'}
        onClick={onToggleSelectAll}
      >
        {showClearSelection
          ? i18n.CLEAR_SELECTION
          : i18n.SELECT_ALL_ALERTS(formattedTotalCount, totalItems)}
      </EuiButtonEmpty>
    </BulkActionsButtonContainer>
  );
};

export const BulkActions = React.memo(BulkActionsComponent);
