/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiButton, EuiPopover } from '@elastic/eui';
import { ISOLATE_HOST } from './translations';
import { TAKE_ACTION } from '../alerts_table/alerts_utility_bar/translations';

export const TakeActionDropdown = React.memo(
  ({ showPanelCallback }: { showPanelCallback: () => void }) => {
    const [isPopoverOpen, setPopover] = useState(false);

    const closePopover = () => {
      setPopover(false);
    };

    const takeActionItems = [
      <EuiContextMenuItem
        key="isolateHost"
        onClick={() => {
          setPopover(false);
          showPanelCallback();
        }}
      >
        {ISOLATE_HOST}
      </EuiContextMenuItem>,
    ];

    const takeActionButton = (
      <EuiButton
        iconSide="right"
        fill
        iconType="arrowDown"
        onClick={() => {
          setPopover(!isPopoverOpen);
        }}
      >
        {TAKE_ACTION}
      </EuiButton>
    );

    return (
      <EuiPopover
        id="hostIsolationTakeActionPanel"
        button={takeActionButton}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel size="s" items={takeActionItems} />
      </EuiPopover>
    );
  }
);

TakeActionDropdown.displayName = 'TakeActionDropdown';
