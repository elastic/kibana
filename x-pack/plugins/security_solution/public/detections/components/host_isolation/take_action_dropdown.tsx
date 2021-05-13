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
import { useHostIsolationStatus } from '../../containers/detection_engine/alerts/use_host_isolation_status';

export const TakeActionDropdown = React.memo(
  ({ onChange, agentId }: { onChange: (action: 'isolateHost') => void; agentId: string }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const closePopoverHandler = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const isolateHostHandler = useCallback(() => {
      setIsPopoverOpen(false);
      onChange('isolateHost');
    }, [onChange]);

    const isolationStatus = useHostIsolationStatus({ agentId });

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
        <EuiContextMenuPanel size="s">
          {isolationStatus === false && (
            <EuiContextMenuItem key="isolateHost" onClick={isolateHostHandler}>
              {ISOLATE_HOST}
            </EuiContextMenuItem>
          )}
        </EuiContextMenuPanel>
      </EuiPopover>
    );
  }
);

TakeActionDropdown.displayName = 'TakeActionDropdown';
