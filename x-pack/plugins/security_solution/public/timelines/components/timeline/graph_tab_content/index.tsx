/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { timelineSelectors } from '../../../store/timeline';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineId } from '../../../../../common/types/timeline';
import { GraphOverlay } from '../../graph_overlay';

interface GraphTabContentProps {
  timelineId: TimelineId;
}

const GraphTabContentComponent: React.FC<GraphTabContentProps> = ({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) => getTimeline(state, timelineId)?.graphEventId
  );

  if (!graphEventId) {
    return null;
  }

  return <GraphOverlay timelineId={timelineId} />;
};

GraphTabContentComponent.displayName = 'GraphTabContentComponent';

const GraphTabContent = React.memo(GraphTabContentComponent);

// eslint-disable-next-line import/no-default-export
export { GraphTabContent as default };
