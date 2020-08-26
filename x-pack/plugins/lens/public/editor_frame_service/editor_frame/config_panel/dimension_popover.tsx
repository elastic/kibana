/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './dimension_popover.scss';

import React from 'react';
import { EuiIcon, EuiFlyoutHeader, EuiFlyoutBody, EuiTitle } from '@elastic/eui';
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
}: {
  popoverState: DimensionPopoverState;
  setPopoverState: (newState: DimensionPopoverState) => void;
  groups: VisualizationDimensionGroupConfig[];
  accessor: string;
  groupId: string;
  trigger: React.ReactElement;
  panel: React.ReactElement;
}) {
  const noMatch = popoverState.isOpen ? !groups.some((d) => d.accessors.includes(accessor)) : false;

  let flyout;
  if (
    popoverState.isOpen &&
    (popoverState.openId === accessor || (noMatch && popoverState.addingToGroupId === groupId))
  ) {
    flyout = (
      <div role="dialog" aria-labelledby="flyoutTitle" className="lnsDimensionPopover">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="xs">
            <button
              onClick={() => {
                setPopoverState({
                  isOpen: false,
                  openId: null,
                  addingToGroupId: null,
                  tabId: null,
                });
              }}
            >
              <h2 id="flyoutTitle">
                <EuiIcon type="sortLeft" /> A typical flyout
              </h2>
            </button>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{panel}</EuiFlyoutBody>
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
