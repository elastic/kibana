/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { BrowserFields } from '../../containers/source';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';

import { EventDetails, EventsViewType, View } from './event_details';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  data: TimelineEventsDetailsItem[];
  id: string;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

export const StatefulEventDetails = React.memo<Props>(
  ({ browserFields, columnHeaders, data, id, onUpdateColumns, timelineId, toggleColumn }) => {
    // TODO: Move to the store
    const [view, setView] = useState<View>(EventsViewType.tableView);

    return (
      <EventDetails
        browserFields={browserFields}
        columnHeaders={columnHeaders}
        data={data}
        id={id}
        onUpdateColumns={onUpdateColumns}
        onViewSelected={setView}
        timelineId={timelineId}
        toggleColumn={toggleColumn}
        view={view}
      />
    );
  }
);

StatefulEventDetails.displayName = 'StatefulEventDetails';
