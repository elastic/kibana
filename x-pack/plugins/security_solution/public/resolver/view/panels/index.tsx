/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import * as selectors from '../../store/selectors';
import { NodeEventsOfType } from './process_event_list';
import { NodeEvents } from './event_counts_for_process';
import { NodeDetail } from './process_details';
import { ProcessListWithCounts } from './process_list_with_counts';
import { EventDetail } from './related_event_detail';
import { PanelViewAndParameters } from '../../types';

/**
 * The team decided to use this table to determine which breadcrumbs/view to display:
 *
 * | Crumb/Table            | &crumbId                   | &crumbEvent              |
 * | :--------------------- | :------------------------- | :----------------------  |
 * | all processes/default  | null                       | null                     |
 * | process detail         | entity_id of process       | null                     |
 * | relateds count by type | entity_id of process       | 'all'                    |
 * | relateds list 1 type   | entity_id of process       | valid related event type |
 * | related event detail   | event_id of related event  | entity_id of process     |
 *
 * This component implements the strategy laid out above by determining the "right" view and doing some other housekeeping e.g. effects to keep the UI-selected node in line with what's indicated by the URL parameters.
 *
 * @returns {JSX.Element} The "right" table content to show based on the query params as described above
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
    // TODO, rename all the component file names
    return (
      <EventDetail
        nodeID={params.panelParameters.nodeID}
        eventType={params.panelParameters.eventType}
        eventID={params.panelParameters.eventID}
      />
    );
  } else {
    /* The default 'Event List' / 'List of all processes' view */
    return <ProcessListWithCounts />;
  }
});
