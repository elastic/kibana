/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr, noop, sortBy } from 'lodash/fp';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { rgba } from 'polished';
import styled from 'styled-components';
import {
  arrayIndexToAriaIndex,
  DATA_COLINDEX_ATTRIBUTE,
  DATA_ROWINDEX_ATTRIBUTE,
  isTab,
  onKeyDownFocusHandler,
} from '@kbn/timelines-plugin/public';
import { dataTableSelectors, tableDefaults } from '@kbn/securitysolution-data-table';
import { isInTableScope, isTimelineScope } from '../../../helpers';
import { timelineSelectors } from '../../../timelines/store';
import type { BrowserFields } from '../../containers/source';
import { getAllFieldsByName } from '../../containers/source';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { getColumnHeaders } from '../../../timelines/components/timeline/body/column_headers/helpers';
import { timelineDefaults } from '../../../timelines/store/defaults';
import { getColumns } from './columns';
import { EVENT_FIELDS_TABLE_CLASS_NAME, onEventDetailsTabKeyPressed, search } from './helpers';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import type { TimelineTabs } from '../../../../common/types/timeline';

export type ColumnsProvider = (providerOptions: {
  browserFields: BrowserFields;
  eventId: string;
  contextId: string;
  scopeId: string;
  getLinkValue: (field: string) => string | null;
  isDraggable?: boolean;
  isReadOnly?: boolean;
}) => Array<EuiBasicTableColumn<TimelineEventsDetailsItem>>;

interface Props {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  isDraggable?: boolean;
  scopeId: string;
  timelineTabType: TimelineTabs | 'flyout';
  isReadOnly?: boolean;
  columnsProvider?: ColumnsProvider;
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
  overflow-x: hidden;
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

  .eventFieldsTable__fieldIcon {
    padding-top: ${({ theme }) => parseFloat(theme.eui.euiSizeXS) * 1.5}px;
  }

  .eventFieldsTable__fieldName {
    line-height: ${({ theme }) => theme.eui.euiLineHeight};
    padding: ${({ theme }) => theme.eui.euiSizeXS};
  }

  // TODO: Use this logic from discover
  /* .eventFieldsTable__multiFieldBadge {
    font: ${({ theme }) => theme.eui.euiFont};
  } */

  .inlineActions {
    opacity: 0;
  }

  .eventFieldsTable__tableRow {
    font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
    font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};

    .inlineActions-popoverOpen {
      opacity: 1;
    }

    &:hover {
      .inlineActions {
        opacity: 1;
      }
    }
  }

  .eventFieldsTable__actionCell,
  .eventFieldsTable__fieldNameCell {
    align-items: flex-start;
    padding: ${({ theme }) => theme.eui.euiSizeXS};
  }

  .eventFieldsTable__fieldValue {
    display: inline-block;
    word-break: break-all;
    word-wrap: break-word;
    white-space: pre-wrap;
    line-height: ${({ theme }) => theme.eui.euiLineHeight};
    color: ${({ theme }) => theme.eui.euiColorFullShade};
    vertical-align: top;
  }
`;

// Match structure in discover
const COUNT_PER_PAGE_OPTIONS = [25, 50, 100];

// Encapsulating the pagination logic for the table.
const useFieldBrowserPagination = () => {
  const [pagination, setPagination] = useState<{ pageIndex: number }>({
    pageIndex: 0,
  });

  const onTableChange = useCallback(({ page: { index } }: { page: { index: number } }) => {
    setPagination({ pageIndex: index });
  }, []);
  const paginationTableProp = useMemo(
    () => ({
      ...pagination,
      pageSizeOptions: COUNT_PER_PAGE_OPTIONS,
    }),
    [pagination]
  );

  return {
    onTableChange,
    paginationTableProp,
  };
};

/**
 * This callback, invoked via `EuiInMemoryTable`'s `rowProps, assigns
 * attributes to every `<tr>`.
 */

/** Renders a table view or JSON view of the `ECS` `data` */
export const EventFieldsBrowser = React.memo<Props>(
  ({
    browserFields,
    data,
    eventId,
    isDraggable,
    timelineTabType,
    scopeId,
    isReadOnly,
    columnsProvider = getColumns,
  }) => {
    const containerElement = useRef<HTMLDivElement | null>(null);
    const getScope = useMemo(() => {
      if (isTimelineScope(scopeId)) {
        return timelineSelectors.getTimelineByIdSelector();
      } else if (isInTableScope(scopeId)) {
        return dataTableSelectors.getTableByIdSelector();
      }
    }, [scopeId]);
    const defaults = isTimelineScope(scopeId) ? timelineDefaults : tableDefaults;
    const columnHeaders = useDeepEqualSelector((state) => {
      const { columns } = (getScope && getScope(state, scopeId)) ?? defaults;
      return getColumnHeaders(columns, browserFields);
    });

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

    const onSetRowProps = useCallback(({ ariaRowindex, field }: TimelineEventsDetailsItem) => {
      const rowIndex = ariaRowindex != null ? { 'data-rowindex': ariaRowindex } : {};
      return {
        ...rowIndex,
        className: 'eventFieldsTable__tableRow',
        'data-test-subj': `event-fields-table-row-${field}`,
      };
    }, []);

    const columns = useMemo(
      () =>
        columnsProvider({
          browserFields,
          eventId,
          contextId: `event-fields-browser-for-${scopeId}-${timelineTabType}`,
          scopeId,
          getLinkValue,
          isDraggable,
          isReadOnly,
        }),
      [
        browserFields,
        eventId,
        scopeId,
        columnsProvider,
        timelineTabType,
        getLinkValue,
        isDraggable,
        isReadOnly,
      ]
    );

    const focusSearchInput = useCallback(() => {
      // the selector below is used to focus the input because EuiInMemoryTable does not expose a ref to its built-in search input
      containerElement.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    }, []);

    const onKeyDown = useCallback(
      (keyboardEvent: React.KeyboardEvent) => {
        if (isTab(keyboardEvent)) {
          onEventDetailsTabKeyPressed({
            containerElement: containerElement.current,
            keyboardEvent,
            onSkipFocusBeforeEventsTable: focusSearchInput,
            onSkipFocusAfterEventsTable: noop,
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
      [data, focusSearchInput]
    );

    useEffect(() => {
      focusSearchInput();
    }, [focusSearchInput]);

    // Pagination
    const { onTableChange, paginationTableProp } = useFieldBrowserPagination();

    return (
      <TableWrapper onKeyDown={onKeyDown} ref={containerElement}>
        <StyledEuiInMemoryTable
          className={EVENT_FIELDS_TABLE_CLASS_NAME}
          items={items}
          itemId="field"
          columns={columns}
          onTableChange={onTableChange}
          pagination={paginationTableProp}
          rowProps={onSetRowProps}
          search={search}
          sorting={false}
          data-test-subj="event-fields-browser"
        />
      </TableWrapper>
    );
  }
);

EventFieldsBrowser.displayName = 'EventFieldsBrowser';
