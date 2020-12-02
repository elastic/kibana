/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { EuiInMemoryTable } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { getOr } from 'lodash/fp';
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
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

/** Renders a table view or JSON view of the `ECS` `data` */
export const EventFieldsBrowser = React.memo<Props>(
  ({ browserFields, columnHeaders, data, eventId, onUpdateColumns, timelineId, toggleColumn }) => {
    const getLinkValue = useCallback(
      (field: string) => {
        const ruleIdField = (data ?? []).find((d) => d.field === 'signal.rule.id');
        const ruleId = getOr(null, 'values.0', ruleIdField);
        return field === 'signal.rule.name' ? ruleId : null;
      },
      [data]
    );

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
    const columns = useMemo(
      () =>
        getColumns({
          browserFields,
          columnHeaders,
          eventId,
          onUpdateColumns,
          contextId: timelineId,
          toggleColumn,
          getLinkValue,
        }),
      [
        browserFields,
        columnHeaders,
        eventId,
        onUpdateColumns,
        timelineId,
        toggleColumn,
        getLinkValue,
      ]
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
