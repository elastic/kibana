/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGrid } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { useState, useEffect, useMemo } from 'react';
import type { ColumnHeaderOptions } from '../../../../common';

import type { BrowserFields } from '../../../../common/search_strategy/index_fields';

import { StatefulFieldsBrowser } from './fields_browser';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from './fields_browser/helpers';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  timelineId: string;
}

/** Renders the timeline header columns */
export const TimelineToolbarComponent = ({ browserFields, columnHeaders, timelineId }: Props) => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  useEffect(() => setVisibleColumns(columnHeaders.map(({ id }) => id)), [columnHeaders]);

  const columns = useMemo(
    () =>
      columnHeaders.map((column) => ({
        ...column,
        actions: { showHide: false },
      })),
    [columnHeaders]
  );

  return (
    <EuiDataGrid
      aria-label="header-data-grid"
      data-test-subj="header-data-grid"
      columnVisibility={{
        visibleColumns,
        setVisibleColumns,
      }}
      rowCount={0}
      renderCellValue={({ rowIndex, columnId }) => `${rowIndex}, ${columnId}`}
      columns={columns}
      toolbarVisibility={{
        showStyleSelector: true,
        showSortSelector: true,
        showFullScreenSelector: true,
        showColumnSelector: {
          allowHide: false,
          allowReorder: true,
        },
        additionalControls: (
          <StatefulFieldsBrowser
            data-test-subj="field-browser"
            height={FIELD_BROWSER_HEIGHT}
            width={FIELD_BROWSER_WIDTH}
            browserFields={browserFields}
            timelineId={timelineId}
            columnHeaders={columnHeaders}
          />
        ),
      }}
    />
  );
};

export const TimelineToolbar = React.memo(
  TimelineToolbarComponent,
  (prevProps, nextProps) =>
    prevProps.timelineId === nextProps.timelineId &&
    deepEqual(prevProps.columnHeaders, nextProps.columnHeaders) &&
    deepEqual(prevProps.browserFields, nextProps.browserFields)
);
