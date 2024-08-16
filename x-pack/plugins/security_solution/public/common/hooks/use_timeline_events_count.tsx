/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { createHtmlPortalNode, OutPortal } from 'react-reverse-portal';

/**
 * A singleton portal for rendering content in the global header
 */
const timelineEventsCountPortalNodeSingleton = createHtmlPortalNode();
const eqlEventsCountPortalNodeSingleton = createHtmlPortalNode();
const esqlEventsCountPortalNodeSingleton = createHtmlPortalNode();

export const useTimelineEventsCountPortal = () => {
  const [timelineEventsCountPortalNode] = useState(timelineEventsCountPortalNodeSingleton);
  return { portalNode: timelineEventsCountPortalNode };
};

export const TimelineEventsCountBadge = React.memo(() => {
  const { portalNode } = useTimelineEventsCountPortal();
  return <OutPortal node={portalNode} />;
});

TimelineEventsCountBadge.displayName = 'TimelineEventsCountBadge';

export const useEqlEventsCountPortal = () => {
  const [eqlEventsCountPortalNode] = useState(eqlEventsCountPortalNodeSingleton);
  return { portalNode: eqlEventsCountPortalNode };
};

export const EqlEventsCountBadge = React.memo(() => {
  const { portalNode } = useEqlEventsCountPortal();
  return <OutPortal node={portalNode} />;
});

EqlEventsCountBadge.displayName = 'EqlEventsCountBadge';

export const useEsqlEventsCountPortal = () => {
  const [esqlEventsCountPortalNode] = useState(esqlEventsCountPortalNodeSingleton);
  return { portalNode: esqlEventsCountPortalNode };
};

export const EsqlEventsCountBadge = React.memo(() => {
  const { portalNode } = useEsqlEventsCountPortal();
  return <OutPortal node={portalNode} />;
});

EsqlEventsCountBadge.displayName = 'EsqlEventsCountBadge';
