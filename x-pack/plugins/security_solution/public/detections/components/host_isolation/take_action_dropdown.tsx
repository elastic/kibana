/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiButton,
  EuiPopover,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { INVESTIGATE_IN_TIMELINE, ISOLATE_HOST, UNISOLATE_HOST } from './translations';
import { TAKE_ACTION } from '../alerts_table/alerts_utility_bar/translations';
import { useHostIsolationStatus } from '../../containers/detection_engine/alerts/use_host_isolation_status';
import { HostStatus } from '../../../../common/endpoint/types';
import { useIsolationPrivileges } from '../../../common/hooks/endpoint/use_isolate_privileges';
import { showTimeline } from '../../../timelines/store/timeline/actions';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { addContentToTimeline } from '../../../timelines/components/timeline/data_providers/helpers';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

export const TakeActionDropdown = React.memo(
  ({
    onChange,
    agentId,
    eventId,
    isAlert,
    isEndpointAlert,
    isolationSupported,
    isHostIsolationPanelOpen,
  }: // timelineId, detection-page (it won't work if I use this)
  {
    onChange: (action: 'isolateHost' | 'unisolateHost') => void;
    agentId: string;
    eventId: string;
    isAlert: boolean;
    isEndpointAlert: boolean;
    isolationSupported: boolean;
    isHostIsolationPanelOpen: boolean;
    // timelineId: string;
  }) => {
    const { loading, isIsolated: isolationStatus, agentStatus } = useHostIsolationStatus({
      agentId,
    });
    const timelineId = 'timeline-1';

    const { isAllowed: isIsolationAllowed } = useIsolationPrivileges();
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const dataProviders = useDeepEqualSelector(
      (state) => (getTimeline(state, timelineId) ?? timelineDefaults).dataProviders
    );

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const dispatch = useDispatch();

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

    const handleInvestigateInTimeline = useCallback(() => {
      const isFilterExist = dataProviders.find((item) => item.id === `${timelineId}-${eventId}`);
      if (isFilterExist) {
        addContentToTimeline({
          dataProviders,
          destination: {
            droppableId: `droppableId.timelineProviders.${timelineId}.group.${dataProviders.length}`,
            index: 0,
          },
          dispatch,
          onAddedToTimeline: closePopoverHandler,
          providerToAdd: {
            id: `${timelineId}-${eventId}`,
            name: eventId,
            enabled: true,
            excluded: false,
            kqlQuery: '',
            queryMatch: {
              displayField: undefined,
              displayValue: undefined,
              field: '_id',
              value: eventId,
              operator: ':',
            },
            and: [],
          },
          timelineId,
        });
      }

      dispatch(showTimeline({ id: timelineId, show: true }));
    }, [closePopoverHandler, dataProviders, dispatch, eventId]);

    const isolateHostKey = isolationStatus === false ? 'isolateHost' : 'unisolateHost';
    const isolateHostTitle = isolationStatus === false ? ISOLATE_HOST : UNISOLATE_HOST;

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
        <EuiContextMenuItem key="take-action-inspect">
          <EuiButtonEmpty
            aria-label={INVESTIGATE_IN_TIMELINE}
            key="investigate-in-timeline-from-flyout"
            data-test-subj="investigate-in-timeline-from-flyout"
            onClick={handleInvestigateInTimeline}
            color="text"
          >
            {INVESTIGATE_IN_TIMELINE}
          </EuiButtonEmpty>
        </EuiContextMenuItem>,
      ],
      [
        agentStatus,
        handleInvestigateInTimeline,
        isEndpointAlert,
        isHostIsolationPanelOpen,
        isIsolationAllowed,
        isolateHostHandler,
        isolateHostKey,
        isolateHostTitle,
        isolationSupported,
        loading,
      ]
    );

    const takeActionButton = useMemo(() => {
      return (
        <EuiButton
          iconSide="right"
          fill
          iconType="arrowDown"
          disabled={items.length === 0}
          onClick={togglePopoverHandler}
        >
          {TAKE_ACTION}
        </EuiButton>
      );
    }, [items.length, togglePopoverHandler]);

    return (
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
    );
  }
);

TakeActionDropdown.displayName = 'TakeActionDropdown';
