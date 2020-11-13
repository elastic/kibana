/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { EuiInMemoryTable } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { timelineActions } from '../../../timelines/store/timeline';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { BrowserFields, getAllFieldsByName } from '../../containers/source';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';

import { getColumns } from './columns';
import { search } from './helpers';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  data: TimelineEventsDetailsItem[];
  eventId: string;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
}

/** Renders a table view or JSON view of the `ECS` `data` */
export const EventFieldsBrowser = React.memo<Props>(
  ({ browserFields, columnHeaders, data, eventId, onUpdateColumns, timelineId }) => {
    const dispatch = useDispatch();
    const fieldsByName = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);
    const items = useMemo(
      () =>
        sortBy(data, ['field']).map((item) => ({
          ...item,
          ...fieldsByName[item.field],
          valuesConcatenated: item.values != null ? item.values.join() : '',
        })),
      [data, fieldsByName]
    );
    const toggleColumn = useCallback(
      (column: ColumnHeaderOptions) => {
        const exists = columnHeaders.findIndex((c) => c.id === column.id) !== -1;

        if (!exists) {
          dispatch(
            timelineActions.upsertColumn({
              column,
              id: timelineId,
              index: 1,
            })
          );
        }

        if (exists) {
          dispatch(
            timelineActions.removeColumn({
              columnId: column.id,
              id: timelineId,
            })
          );
        }
      },
      [columnHeaders, dispatch, timelineId]
    );

    const columns = useMemo(
      () =>
        getColumns({
          browserFields,
          columnHeaders,
          eventId,
          onUpdateColumns,
          contextId: timelineId,
          toggleColumn,
        }),
      [browserFields, columnHeaders, eventId, onUpdateColumns, timelineId, toggleColumn]
    );

    return (
      <div className="euiTable--compressed">
        <EuiInMemoryTable
          // @ts-expect-error items going in match Partial<BrowserField>, column `render` callbacks expect complete BrowserField
          items={items}
          columns={columns}
          pagination={false}
          search={search}
          sorting={true}
        />
      </div>
    );
  }
);

EventFieldsBrowser.displayName = 'EventFieldsBrowser';
