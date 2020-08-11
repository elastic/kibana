/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';

import { BrowserFields } from '../../containers/source';
import { DetailItem } from '../../../graphql/types';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';

import { EventDetails, View } from './event_details';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  data: DetailItem[];
  id: string;
  onEventToggled: () => void;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

export const StatefulEventDetails = React.memo<Props>(
  ({
    browserFields,
    columnHeaders,
    data,
    id,
    onEventToggled,
    onUpdateColumns,
    timelineId,
    toggleColumn,
  }) => {
    const [view, setView] = useState<View>('table-view');

    const handleSetView = useCallback((newView) => setView(newView), []);
    return (
      <EventDetails
        browserFields={browserFields}
        columnHeaders={columnHeaders}
        data={data}
        id={id}
        onEventToggled={onEventToggled}
        onUpdateColumns={onUpdateColumns}
        onViewSelected={handleSetView}
        timelineId={timelineId}
        toggleColumn={toggleColumn}
        view={view}
      />
    );
  }
);

StatefulEventDetails.displayName = 'StatefulEventDetails';
