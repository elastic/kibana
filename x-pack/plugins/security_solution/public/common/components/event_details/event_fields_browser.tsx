/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, noop, sortBy } from 'lodash/fp';
import { EuiInMemoryTable } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { rgba } from 'polished';
import styled from 'styled-components';

import {
  arrayIndexToAriaIndex,
  DATA_COLINDEX_ATTRIBUTE,
  DATA_ROWINDEX_ATTRIBUTE,
  isTab,
  onKeyDownFocusHandler,
} from '../accessibility/helpers';
import { ADD_TIMELINE_BUTTON_CLASS_NAME } from '../../../timelines/components/flyout/add_timeline_button';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { BrowserFields, getAllFieldsByName } from '../../containers/source';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { getColumnHeaders } from '../../../timelines/components/timeline/body/column_headers/helpers';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

import { getColumns } from './columns';
import { EVENT_FIELDS_TABLE_CLASS_NAME, onEventDetailsTabKeyPressed, search } from './helpers';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { TimelineTabs } from '../../../../common/types/timeline';

interface Props {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  timelineId: string;
  timelineTabType: TimelineTabs | 'flyout';
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

/**
 * This callback, invoked via `EuiInMemoryTable`'s `rowProps, assigns
 * attributes to every `<tr>`.
 */
const getAriaRowindex = (timelineEventsDetailsItem: TimelineEventsDetailsItem) =>
  timelineEventsDetailsItem.ariaRowindex != null
    ? { 'data-rowindex': timelineEventsDetailsItem.ariaRowindex }
    : {};

/** Renders a table view or JSON view of the `ECS` `data` */
export const EventFieldsBrowser = React.memo<Props>(
  ({ browserFields, data, eventId, timelineTabType, timelineId }) => {
    const containerElement = useRef<HTMLDivElement | null>(null);
    const dispatch = useDispatch();
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const fieldsByName = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);
    const items = useMemo(
      () =>
        sortBy(['field'], data).map((item, i) => ({
          ...item,
          ...fieldsByName[item.field],
          valuesConcatenated: item.values != null ? item.values.join() : '',
          ariaRowindex: arrayIndexToAriaIndex(i),
        })),
      [data, fieldsByName]
    );

    const columnHeaders = useDeepEqualSelector((state) => {
      const { columns } = getTimeline(state, timelineId) ?? timelineDefaults;

      return getColumnHeaders(columns, browserFields);
    });

    const getLinkValue = useCallback(
      (field: string) => {
        const linkField = (columnHeaders.find((col) => col.id === field) ?? {}).linkField;
        if (!linkField) {
          return null;
        }
        const linkFieldData = (data ?? []).find((d) => d.field === linkField);
        const linkFieldValue = getOr(null, 'originalValue', linkFieldData);
        return Array.isArray(linkFieldValue) ? linkFieldValue[0] : linkFieldValue;
      },
      [data, columnHeaders]
    );

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
          contextId: `event-fields-browser-for-${timelineId}-${timelineTabType}`,
          timelineId,
          toggleColumn,
          getLinkValue,
        }),
      [
        browserFields,
        columnHeaders,
        eventId,
        onUpdateColumns,
        timelineId,
        timelineTabType,
        toggleColumn,
        getLinkValue,
      ]
    );

    const focusSearchInput = useCallback(() => {
      // the selector below is used to focus the input because EuiInMemoryTable does not expose a ref to its built-in search input
      containerElement.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    }, []);

    const focusAddTimelineButton = useCallback(() => {
      // the document selector below is required because we may be in a flyout or full screen timeline context
      document.querySelector<HTMLButtonElement>(`.${ADD_TIMELINE_BUTTON_CLASS_NAME}`)?.focus();
    }, []);

    const onKeyDown = useCallback(
      (keyboardEvent: React.KeyboardEvent) => {
        if (isTab(keyboardEvent)) {
          onEventDetailsTabKeyPressed({
            containerElement: containerElement.current,
            keyboardEvent,
            onSkipFocusBeforeEventsTable: focusSearchInput,
            onSkipFocusAfterEventsTable: focusAddTimelineButton,
          });
        } else {
          onKeyDownFocusHandler({
            colindexAttribute: DATA_COLINDEX_ATTRIBUTE,
            containerElement: containerElement?.current,
            event: keyboardEvent,
            maxAriaColindex: 3,
            maxAriaRowindex: data.length,
            onColumnFocused: noop,
            rowindexAttribute: DATA_ROWINDEX_ATTRIBUTE,
          });
        }
      },
      [data, focusAddTimelineButton, focusSearchInput]
    );

    useEffect(() => {
      focusSearchInput();
    }, [focusSearchInput]);

    return (
      <TableWrapper onKeyDown={onKeyDown} ref={containerElement}>
        <StyledEuiInMemoryTable
          className={EVENT_FIELDS_TABLE_CLASS_NAME}
          items={items}
          columns={columns}
          pagination={false}
          rowProps={getAriaRowindex}
          search={search}
          sorting={false}
        />
      </TableWrapper>
    );
  }
);

EventFieldsBrowser.displayName = 'EventFieldsBrowser';
