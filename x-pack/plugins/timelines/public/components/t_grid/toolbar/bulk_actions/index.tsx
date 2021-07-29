/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiButtonEmpty, EuiContextMenuPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useState, useCallback } from 'react';
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

const BulkActionsContainer = styled.div`
  display: inline-block;
  position: relative;
`;

BulkActionsContainer.displayName = 'BulkActionsContainer';

/**
 * Stateless component integrating the bulk actions menu and the select all button
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

  const onToggleSelectAll = useCallback(() => {
    if (!showClearSelection) {
      onSelectAll();
    } else {
      onClearSelection();
    }
  }, [onClearSelection, onSelectAll, showClearSelection]);

  return (
    <BulkActionsContainer data-test-subj="bulk-actions-button-container">
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
            {i18n.SELECTED_ALERTS(
              showClearSelection ? formattedTotalCount : formattedSelectedEventsCount,
              showClearSelection ? totalItems : selectedCount
            )}
          </EuiButtonEmpty>
        }
        closePopover={() => setIsActionsOpen(false)}
      >
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
    </BulkActionsContainer>
  );
};

export const BulkActions = React.memo(BulkActionsComponent);
