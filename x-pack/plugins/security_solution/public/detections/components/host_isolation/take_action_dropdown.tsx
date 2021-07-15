/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiButton, EuiPopover } from '@elastic/eui';
import { INVESTIGATE_IN_TIMELINE, ISOLATE_HOST, UNISOLATE_HOST } from './translations';
import { TAKE_ACTION } from '../alerts_table/alerts_utility_bar/translations';
import { useHostIsolationStatus } from '../../containers/detection_engine/alerts/use_host_isolation_status';
import { HostStatus } from '../../../../common/endpoint/types';
import { InvestigateInTimelineAction } from '../alerts_table/timeline_actions/investigate_in_timeline_action';
import { Ecs } from '../../../../common/ecs';
import { getEventType } from '../../../timelines/components/timeline/body/helpers';

export const TakeActionDropdown = React.memo(
  ({
    onChange,
    agentId,
    ecsData,
    isAlert,
    isIsolationAllowed,
    isEndpointAlert,
    isolationSupported,
    isHostIsolationPanelOpen,
  }: {
    onChange: (action: 'isolateHost' | 'unisolateHost') => void;
    agentId: string;
    ecsData: Ecs;
    isAlert: boolean;
    isIsolationAllowed: boolean;
    isEndpointAlert: boolean;
    isolationSupported: boolean;
    isHostIsolationPanelOpen: boolean;
  }) => {
    const { loading, isIsolated: isolationStatus, agentStatus } = useHostIsolationStatus({
      agentId,
    });
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
          // disabled={loading || agentStatus === HostStatus.UNENROLLED}
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
        >
          {TAKE_ACTION}
        </EuiButton>
      );
    }, [isPopoverOpen]);

    const isolateHostKey = isolationStatus === false ? 'isolateHost' : 'unisolateHost';
    const isolateHostTitle = isolationStatus === false ? ISOLATE_HOST : UNISOLATE_HOST;
    const eventType = getEventType(ecsData);

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
          {isIsolationAllowed &&
            isEndpointAlert &&
            isolationSupported &&
            isHostIsolationPanelOpen === false && (
              <EuiContextMenuItem
                key={isolateHostKey}
                onClick={isolateHostHandler}
                disabled={loading || agentStatus === HostStatus.UNENROLLED}
              >
                {isolateHostTitle}
              </EuiContextMenuItem>
            )}

          {eventType === 'signal' && (
            <EuiContextMenuItem key="take-action-inspect">
              <InvestigateInTimelineAction
                ariaLabel={INVESTIGATE_IN_TIMELINE}
                key="investigate-in-timeline-from-flyout"
                ecsRowData={ecsData}
                nonEcsRowData={[]}
                type="text"
                onInvestigateInTimelineAlertClick={closePopoverHandler}
              />
            </EuiContextMenuItem>
          )}
        </EuiContextMenuPanel>
      </EuiPopover>
    );
  }
);

TakeActionDropdown.displayName = 'TakeActionDropdown';
