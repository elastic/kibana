/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { EuiInMemoryTable } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { rgba } from 'polished';
import styled from 'styled-components';

import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { BrowserFields, getAllFieldsByName } from '../../containers/source';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { getColumnHeaders } from '../../../timelines/components/timeline/body/column_headers/helpers';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

import { getColumns } from './columns';
import { search } from './helpers';
import { useDeepEqualSelector } from '../../hooks/use_selector';

interface Props {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  timelineId: string;
}

const TableWrapper = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;

  > div {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;

    > .euiFlexGroup:first-of-type {
      flex: 0;
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StyledEuiInMemoryTable = styled(EuiInMemoryTable as any)`
  flex: 1;
  overflow: auto;

  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.eui.euiScrollBar};
    width: ${({ theme }) => theme.eui.euiScrollBar};
  }

  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.eui.euiColorDarkShade, 0.5)};
    border: ${({ theme }) => theme.eui.euiScrollBarCorner} solid transparent;
  }

  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;

/** Renders a table view or JSON view of the `ECS` `data` */
export const EventFieldsBrowser = React.memo<Props>(
  ({ browserFields, data, eventId, timelineId }) => {
    const dispatch = useDispatch();
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
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

    const columnHeaders = useDeepEqualSelector((state) => {
      const { columns } = getTimeline(state, timelineId) ?? timelineDefaults;

      return getColumnHeaders(columns, browserFields);
    });

    const toggleColumn = useCallback(
      (column: ColumnHeaderOptions) => {
        if (columnHeaders.some((c) => c.id === column.id)) {
          dispatch(
            timelineActions.removeColumn({
              columnId: column.id,
              id: timelineId,
            })
          );
        } else {
          dispatch(
            timelineActions.upsertColumn({
              column,
              id: timelineId,
              index: 1,
            })
          );
        }
      },
      [columnHeaders, dispatch, timelineId]
    );

    const onUpdateColumns = useCallback(
      (columns) => dispatch(timelineActions.updateColumns({ id: timelineId, columns })),
      [dispatch, timelineId]
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
      <TableWrapper>
        <StyledEuiInMemoryTable
          items={items}
          columns={columns}
          pagination={false}
          search={search}
          sorting={true}
        />
      </TableWrapper>
    );
  }
);

EventFieldsBrowser.displayName = 'EventFieldsBrowser';
