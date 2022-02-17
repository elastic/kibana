/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { EuiContextMenuItem } from '@elastic/eui';
import { get } from 'lodash/fp';
import {
  setActiveTabTimeline,
  updateTimelineGraphEventId,
} from '../../../../timelines/store/timeline/actions';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../../common/containers/use_full_screen';
import { TimelineId, TimelineTabs } from '../../../../../common/types';
import { ACTION_INVESTIGATE_IN_RESOLVER } from '../../../../timelines/components/timeline/body/translations';
import { Ecs } from '../../../../../common/ecs';

export const isInvestigateInResolverActionEnabled = (ecsData?: Ecs) =>
  (get(['agent', 'type', 0], ecsData) === 'endpoint' ||
    (get(['agent', 'type', 0], ecsData) === 'winlogbeat' &&
      get(['event', 'module', 0], ecsData) === 'sysmon')) &&
  get(['process', 'entity_id'], ecsData)?.length === 1 &&
  get(['process', 'entity_id', 0], ecsData) !== '';
interface InvestigateInResolverProps {
  timelineId: string;
  ecsData: Ecs;
  onClose: () => void;
}
export const useInvestigateInResolverContextItem = ({
  timelineId,
  ecsData,
  onClose,
}: InvestigateInResolverProps) => {
  const dispatch = useDispatch();
  const isDisabled = useMemo(() => !isInvestigateInResolverActionEnabled(ecsData), [ecsData]);
  const { setGlobalFullScreen } = useGlobalFullScreen();
  const { setTimelineFullScreen } = useTimelineFullScreen();
  const handleClick = useCallback(() => {
    const dataGridIsFullScreen = document.querySelector('.euiDataGrid--fullScreen');
    dispatch(updateTimelineGraphEventId({ id: timelineId, graphEventId: ecsData._id }));
    if (timelineId === TimelineId.active) {
      if (dataGridIsFullScreen) {
        setTimelineFullScreen(true);
      }
      dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.graph }));
    } else {
      if (dataGridIsFullScreen) {
        setGlobalFullScreen(true);
      }
    }
    onClose();
  }, [dispatch, ecsData._id, onClose, timelineId, setGlobalFullScreen, setTimelineFullScreen]);
  return isDisabled
    ? []
    : [
        <EuiContextMenuItem
          key="investigate-in-resolver-action-item"
          data-test-subj="investigate-in-resolver-action-item"
          onClick={handleClick}
        >
          {ACTION_INVESTIGATE_IN_RESOLVER}
        </EuiContextMenuItem>,
      ];
};
