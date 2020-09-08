/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './dimension_popover.scss';

import React from 'react';
import {
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButtonEmpty,
  EuiFlexItem,
} from '@elastic/eui';
import { VisualizationDimensionGroupConfig } from '../../../types';
import { DimensionPopoverState } from './types';

export function DimensionPopover({
  popoverState,
  setPopoverState,
  groups,
  accessor,
  groupId,
  trigger,
  panel,
  panelTitle,
}: {
  popoverState: DimensionPopoverState;
  setPopoverState: (newState: DimensionPopoverState) => void;
  groups: VisualizationDimensionGroupConfig[];
  accessor: string;
  groupId: string;
  trigger: React.ReactElement;
  panel: React.ReactElement;
  panelTitle: React.ReactNode;
}) {
  const noMatch = popoverState.isOpen ? !groups.some((d) => d.accessors.includes(accessor)) : false;

  const closeFlyout = () => {
    setPopoverState({
      isOpen: false,
      openId: null,
      addingToGroupId: null,
    });
  };

  let flyout;
  if (
    popoverState.isOpen &&
    (popoverState.openId === accessor || (noMatch && popoverState.addingToGroupId === groupId))
  ) {
    flyout = (
      <div
        role="dialog"
        aria-labelledby="lnsDimensionPopoverFlyoutTitle"
        className="lnsDimensionPopover"
      >
        <EuiFlyoutHeader hasBorder className="lnsDimensionPopover__header">
          <EuiTitle size="xs">
            <EuiButtonEmpty
              onClick={closeFlyout}
              data-test-subj="lnsDimensionPopoverFlyoutTitle"
              id="lnsDimensionPopoverFlyoutTitle"
              iconType="sortLeft"
              flush="left"
            >
              <strong>{panelTitle}</strong>
            </EuiButtonEmpty>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlexItem className="eui-yScrollWithShadows" grow={1}>
          {panel}
        </EuiFlexItem>
        <EuiFlyoutFooter className="lnsDimensionPopover__footer">
          <EuiButtonEmpty flush="left" size="s" iconType="cross" onClick={closeFlyout}>
            Close
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </div>
    );
  }

  return (
    <>
      <div className="lnsDimensionPopover__trigger">{trigger}</div>
      {flyout}
    </>
  );
}
