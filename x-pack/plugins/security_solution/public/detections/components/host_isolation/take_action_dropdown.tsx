/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiButton, EuiPopover } from '@elastic/eui';
import { ISOLATE_HOST, UNISOLATE_HOST } from './translations';
import { TAKE_ACTION } from '../alerts_table/alerts_utility_bar/translations';
import { useHostIsolationStatus } from '../../containers/detection_engine/alerts/use_host_isolation_status';

export const TakeActionDropdown = React.memo(
  ({
    onChange,
    agentId,
  }: {
    onChange: (action: 'isolateHost' | 'unisolateHost') => void;
    agentId: string;
  }) => {
    const { loading, isIsolated: isolationStatus } = useHostIsolationStatus({ agentId });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const closePopoverHandler = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const isolateHostHandler = useCallback(() => {
      setIsPopoverOpen(false);
      if (isolationStatus === false) {
        onChange('isolateHost');
      } else {
        onChange('unisolateHost');
      }
    }, [onChange, isolationStatus]);

    const takeActionButton = useMemo(() => {
      return (
        <EuiButton
          iconSide="right"
          fill
          iconType="arrowDown"
          disabled={loading}
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
        >
          {TAKE_ACTION}
        </EuiButton>
      );
    }, [isPopoverOpen, loading]);

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
          {isolationStatus === false ? (
            <EuiContextMenuItem key="isolateHost" onClick={isolateHostHandler}>
              {ISOLATE_HOST}
            </EuiContextMenuItem>
          ) : (
            <EuiContextMenuItem key="unisolateHost" onClick={isolateHostHandler}>
              {UNISOLATE_HOST}
            </EuiContextMenuItem>
          )}
        </EuiContextMenuPanel>
      </EuiPopover>
    );
  }
);

TakeActionDropdown.displayName = 'TakeActionDropdown';
