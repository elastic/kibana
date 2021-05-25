/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiButton, EuiPopover } from '@elastic/eui';
import { ISOLATE_HOST } from './translations';
import { TAKE_ACTION } from '../alerts_table/alerts_utility_bar/translations';

export const TakeActionDropdown = React.memo(
  ({ onChange }: { onChange: (action: 'isolateHost') => void }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const closePopoverHandler = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const takeActionItems = useMemo(() => {
      return [
        <EuiContextMenuItem
          key="isolateHost"
          onClick={() => {
            setIsPopoverOpen(false);
            onChange('isolateHost');
          }}
        >
          {ISOLATE_HOST}
        </EuiContextMenuItem>,
      ];
    }, [onChange]);

    const takeActionButton = useMemo(() => {
      return (
        <EuiButton
          iconSide="right"
          fill
          iconType="arrowDown"
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
        >
          {TAKE_ACTION}
        </EuiButton>
      );
    }, [isPopoverOpen]);

    return (
      <EuiPopover
        id="hostIsolationTakeActionPanel"
        button={takeActionButton}
        isOpen={isPopoverOpen}
        closePopover={closePopoverHandler}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel size="s" items={takeActionItems} />
      </EuiPopover>
    );
  }
);

TakeActionDropdown.displayName = 'TakeActionDropdown';
