/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { createPortalNode, OutPortal } from 'react-reverse-portal';

/**
 * A singleton portal for rendering content in the global header
 */
const timelineEventsCountPortalNodeSingleton = createPortalNode();

export const useTimelineEventsCountPortal = () => {
  const [timelineEventsCountPortalNode] = useState(timelineEventsCountPortalNodeSingleton);

  return { timelineEventsCountPortalNode };
};

export const TimelineEventsCountBadge = React.memo(() => {
  const { timelineEventsCountPortalNode } = useTimelineEventsCountPortal();

  return <OutPortal node={timelineEventsCountPortalNode} />;
});

TimelineEventsCountBadge.displayName = 'TimelineEventsCountBadge';
