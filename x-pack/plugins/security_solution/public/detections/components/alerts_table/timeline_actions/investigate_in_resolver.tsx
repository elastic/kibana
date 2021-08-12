/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import {
  setActiveTabTimeline,
  updateTimelineGraphEventId,
} from '../../../../timelines/store/timeline/actions';
import { TimelineId, TimelineTabs } from '../../../../../common';
import { isInvestigateInResolverActionEnabled } from '../../../../timelines/components/timeline/body/helpers';
import { ACTION_INVESTIGATE_IN_RESOLVER } from '../../../../timelines/components/timeline/body/translations';
import { Ecs } from '../../../../../common/ecs';

interface InvestigateInResolverProps {
  timelineId: string;
  ecsData: Ecs;
}
export const useInvestigateInResolverContextItem = ({
  timelineId,
  ecsData,
}: InvestigateInResolverProps) => {
  const dispatch = useDispatch();
  const isDisabled = useMemo(() => !isInvestigateInResolverActionEnabled(ecsData), [ecsData]);
  const handleClick = useCallback(() => {
    dispatch(updateTimelineGraphEventId({ id: timelineId, graphEventId: ecsData._id }));
    if (timelineId === TimelineId.active) {
      dispatch(setActiveTabTimeline({ id: timelineId, activeTab: TimelineTabs.graph }));
    }
  }, [dispatch, ecsData._id, timelineId]);
  return {
    disabled: isDisabled,
    name: ACTION_INVESTIGATE_IN_RESOLVER,
    onClick: handleClick,
  };
};
