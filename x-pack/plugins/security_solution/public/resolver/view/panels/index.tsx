/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { memo, useState } from 'react';
import { useSelector } from 'react-redux';
import * as selectors from '../../store/selectors';
import { NodeEventsInCategory } from './node_events_of_type';
import { NodeEvents } from './node_events';
import { NodeDetail } from './node_detail';
import { NodeList } from './node_list';
import { EventDetail } from './event_detail';
import { PanelViewAndParameters } from '../../types';
import { ResolverPanelContext } from './panel_context';

/**
 * Show the panel that matches the `panelViewAndParameters` (derived from the browser's location.search)
 */

export const PanelRouter = memo(function () {
  const params: PanelViewAndParameters = useSelector(selectors.panelViewAndParameters);
  const [isHoveringInPanel, updateIsHoveringInPanel] = useState(false);

  const triggerPanelHover = () => updateIsHoveringInPanel(true);
  const stopPanelHover = () => updateIsHoveringInPanel(false);

  /* The default 'Event List' / 'List of all processes' view */
  let panelViewToRender = <NodeList />;

  if (params.panelView === 'nodeDetail') {
    panelViewToRender = <NodeDetail nodeID={params.panelParameters.nodeID} />;
  } else if (params.panelView === 'nodeEvents') {
    panelViewToRender = <NodeEvents nodeID={params.panelParameters.nodeID} />;
  } else if (params.panelView === 'nodeEventsInCategory') {
    panelViewToRender = (
      <NodeEventsInCategory
        nodeID={params.panelParameters.nodeID}
        eventCategory={params.panelParameters.eventCategory}
      />
    );
  } else if (params.panelView === 'eventDetail') {
    panelViewToRender = (
      <EventDetail
        nodeID={params.panelParameters.nodeID}
        eventID={params.panelParameters.eventID}
        eventCategory={params.panelParameters.eventCategory}
      />
    );
  }

  return (
    <ResolverPanelContext.Provider value={{ isHoveringInPanel }}>
      <div onMouseEnter={triggerPanelHover} onMouseLeave={stopPanelHover}>
        {panelViewToRender}
      </div>
    </ResolverPanelContext.Provider>
  );
});
