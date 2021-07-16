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
import { HostStatus } from '../../../../common/endpoint/types';
import { useIsolationPrivileges } from '../../../common/hooks/endpoint/use_isolate_privileges';

import { getEventType } from '../../../timelines/components/timeline/body/helpers';
import { InvestigateInTimelineAction } from '../alerts_table/timeline_actions/investigate_in_timeline_action';
import { TimelineNonEcsData } from '../../../../common';
import { Ecs } from '../../../../common/ecs';

export const TakeActionDropdown = React.memo(
  ({
    onChange,
    agentId,
    eventId,
    ecsData,
    nonEcsData,
    isAlert,
    isEndpointAlert,
    isolationSupported,
    isHostIsolationPanelOpen,
    loadingEventDetails,
  }: {
    onChange: (action: 'isolateHost' | 'unisolateHost') => void;
    agentId: string;
    eventId: string;
    ecsData?: Ecs;
    nonEcsData?: TimelineNonEcsData[];
    isAlert: boolean;
    isEndpointAlert: boolean;
    isolationSupported: boolean;
    isHostIsolationPanelOpen: boolean;
    loadingEventDetails: boolean;
  }) => {
    const { loading, isIsolated: isolationStatus, agentStatus } = useHostIsolationStatus({
      agentId,
    });

    const { isAllowed: isIsolationAllowed } = useIsolationPrivileges();

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const togglePopoverHandler = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [isPopoverOpen]);

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

    const isolateHostKey = isolationStatus === false ? 'isolateHost' : 'unisolateHost';
    const isolateHostTitle = isolationStatus === false ? ISOLATE_HOST : UNISOLATE_HOST;
    const eventType = ecsData != null ? getEventType(ecsData) : null;

    const items = useMemo(
      () => [
        ...(isIsolationAllowed &&
        isEndpointAlert &&
        isolationSupported &&
        isHostIsolationPanelOpen === false
          ? [
              <EuiContextMenuItem
                key={isolateHostKey}
                onClick={isolateHostHandler}
                disabled={loading || agentStatus === HostStatus.UNENROLLED}
              >
                {isolateHostTitle}
              </EuiContextMenuItem>,
            ]
          : []),
        ...(eventType === 'signal' && ecsData != null
          ? [
              <EuiContextMenuItem key="take-action-inspect">
                <InvestigateInTimelineAction
                  key="investigate-in-timeline"
                  ecsRowData={ecsData}
                  nonEcsRowData={nonEcsData ?? []}
                  buttonType="text"
                />
              </EuiContextMenuItem>,
            ]
          : []),
      ],
      [
        agentStatus,
        ecsData,
        eventType,
        isEndpointAlert,
        isHostIsolationPanelOpen,
        isIsolationAllowed,
        isolateHostHandler,
        isolateHostKey,
        isolateHostTitle,
        isolationSupported,
        loading,
        nonEcsData,
      ]
    );

    const takeActionButton = useMemo(() => {
      return (
        <EuiButton iconSide="right" fill iconType="arrowDown" onClick={togglePopoverHandler}>
          {TAKE_ACTION}
        </EuiButton>
      );
    }, [togglePopoverHandler]);

    return items.length > 0 && !loadingEventDetails ? (
      <EuiPopover
        id="hostIsolationTakeActionPanel"
        button={takeActionButton}
        isOpen={isPopoverOpen}
        closePopover={closePopoverHandler}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel size="s" items={items} />
      </EuiPopover>
    ) : null;
  }
);

TakeActionDropdown.displayName = 'TakeActionDropdown';
