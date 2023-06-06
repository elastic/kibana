/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { CompositeSLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';

export interface CompositeSloListItemProps {
  compositeSlo: CompositeSLOWithSummaryResponse;
  onConfirmDelete: (slo: CompositeSLOWithSummaryResponse) => void;
}

export function CompositeSloListItem({ compositeSlo, onConfirmDelete }: CompositeSloListItemProps) {
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const handleClickActions = () => {
    setIsActionsPopoverOpen(!isActionsPopoverOpen);
  };

  return (
    <EuiPanel data-test-subj="sloItem" hasBorder hasShadow={false}>
      <EuiFlexGroup responsive={false} alignItems="center">
        {/* CONTENT */}
        <EuiFlexItem grow>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem>
                  <EuiText size="s">
                    <span>{compositeSlo.name}</span>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* ACTIONS */}
        <EuiFlexItem grow={false}>
          <EuiPopover
            anchorPosition="downLeft"
            button={
              <EuiButtonIcon
                aria-label="Actions"
                color="text"
                disabled={!compositeSlo.summary}
                display="empty"
                iconType="boxesVertical"
                size="s"
                onClick={handleClickActions}
              />
            }
            panelPaddingSize="m"
            closePopover={handleClickActions}
            isOpen={isActionsPopoverOpen}
          >
            <EuiContextMenuPanel size="m" items={[]} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
