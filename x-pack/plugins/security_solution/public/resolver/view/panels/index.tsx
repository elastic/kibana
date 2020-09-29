/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import * as selectors from '../../store/selectors';
import { NodeEventsOfType } from './node_events_of_type';
import { NodeEvents } from './node_events';
import { NodeDetail } from './node_detail';
import { NodeList } from './node_list';
import { EventDetail } from './event_detail';
import { PanelViewAndParameters } from '../../types';

/**
 * Show the panel that matches the `panelViewAndParameters` (derived from the browser's location.search)
 */
export const PanelRouter = memo(function () {
  const params: PanelViewAndParameters = useSelector(selectors.panelViewAndParameters);
  if (params.panelView === 'nodeDetail') {
    return <NodeDetail nodeID={params.panelParameters.nodeID} />;
  } else if (params.panelView === 'nodeEvents') {
    return <NodeEvents nodeID={params.panelParameters.nodeID} />;
  } else if (params.panelView === 'nodeEventsOfType') {
    return (
      <NodeEventsOfType
        nodeID={params.panelParameters.nodeID}
        eventType={params.panelParameters.eventType}
      />
    );
  } else if (params.panelView === 'eventDetail') {
    return (
      <EventDetail
        nodeID={params.panelParameters.nodeID}
        eventID={params.panelParameters.eventID}
        eventType={params.panelParameters.eventType}
      />
    );
  } else {
    /* The default 'Event List' / 'List of all processes' view */
    return <NodeList />;
  }
});
