/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPopover } from '@elastic/eui';
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
  return (
    <EuiPopover
      className="lnsDimensionPopover"
      anchorClassName="lnsDimensionPopover__trigger"
      isOpen={
        popoverState.isOpen &&
        (popoverState.openId === accessor || (noMatch && popoverState.addingToGroupId === groupId))
      }
      closePopover={() => {
        setPopoverState({ isOpen: false, openId: null, addingToGroupId: null, tabId: null });
      }}
      button={trigger}
      anchorPosition="leftUp"
      panelPaddingSize="none"
    >
      {panel}
    </EuiPopover>
  );
}
