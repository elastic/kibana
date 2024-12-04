/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGrid } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';

export function PreviewTable({ documents }: { documents: unknown[] }) {
  const [height, setHeight] = useState('100px');
  useEffect(() => {
    // set height to 100% after a short delay otherwise it doesn't calculate correctly
    // TODO: figure out a better way to do this
    setTimeout(() => {
      setHeight(`100%`);
    }, 50);
  }, []);

  const columns = useMemo(() => {
    const cols = new Set<string>();
    documents.forEach((doc) => {
      if (!doc || typeof doc !== 'object') {
        return;
      }
      Object.keys(doc).forEach((key) => {
        cols.add(key);
      });
    });
    return Array.from(cols);
  }, [documents]);

  const gridColumns = useMemo(() => {
    return Array.from(columns).map((column) => ({
      id: column,
      displayAsText: column,
    }));
  }, [columns]);

  return (
    <EuiDataGrid
      aria-label={i18n.translate('xpack.streams.resultPanel.euiDataGrid.previewLabel', {
        defaultMessage: 'Preview',
      })}
      columns={gridColumns}
      columnVisibility={{
        visibleColumns: columns,
        setVisibleColumns: () => {},
        canDragAndDropColumns: false,
      }}
      toolbarVisibility={false}
      rowCount={documents.length}
      height={height}
      renderCellValue={({ rowIndex, columnId }) => {
        const doc = documents[rowIndex];
        if (!doc || typeof doc !== 'object') {
          return '';
        }
        const value = (doc as Record<string, unknown>)[columnId];
        if (value === undefined || value === null) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      }}
    />
  );
}
