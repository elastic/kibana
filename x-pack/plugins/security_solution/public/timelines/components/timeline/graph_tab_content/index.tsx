/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { timelineSelectors } from '../../../store/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { GraphOverlay } from '../../graph_overlay';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';

interface GraphTabContentProps {
  timelineId: string;
}

const GraphTabContentComponent: React.FC<GraphTabContentProps> = ({ timelineId }) => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const { timelineType, graphEventId } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );

  if (!graphEventId) {
    return null;
  }

  return (
    <GraphOverlay
      graphEventId={graphEventId}
      isEventViewer={false}
      timelineId={timelineId}
      timelineType={timelineType}
    />
  );
};

export const GraphTabContent = React.memo(GraphTabContentComponent);
