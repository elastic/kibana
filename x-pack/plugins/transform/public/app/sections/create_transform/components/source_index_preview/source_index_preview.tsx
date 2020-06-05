/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiCopy,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { KBN_FIELD_TYPES } from '../../../../../../../../../src/plugins/data/common';

import { formatHumanReadableDateTimeSeconds } from '../../../../../../common/utils/date_utils';
import { getNestedProperty } from '../../../../../../common/utils/object_utils';

import {
  euiDataGridStyle,
  euiDataGridToolbarSettings,
  EsFieldName,
  PivotQuery,
  INIT_MAX_COLUMNS,
} from '../../../../common';
import { SearchItems } from '../../../../hooks/use_search_items';
import { useToastNotifications } from '../../../../app_dependencies';

import { getSourceIndexDevConsoleStatement } from './common';
import { SOURCE_INDEX_STATUS, useSourceIndexData } from './use_source_index_data';

interface SourceIndexPreviewTitle {
  indexPatternTitle: string;
}
const SourceIndexPreviewTitle: React.FC<SourceIndexPreviewTitle> = ({ indexPatternTitle }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.transform.sourceIndexPreview.sourceIndexPatternTitle', {
        defaultMessage: 'Source index {indexPatternTitle}',
        values: { indexPatternTitle },
      })}
    </span>
  </EuiTitle>
);

interface Props {
  indexPattern: SearchItems['indexPattern'];
  query: PivotQuery;
}

export const SourceIndexPreview: React.FC<Props> = React.memo(({ indexPattern, query }) => {
  const toastNotifications = useToastNotifications();
  const allFields = indexPattern.fields.map((f) => f.name);
  const indexPatternFields: string[] = allFields.filter((f) => {
    if (indexPattern.metaFields.includes(f)) {
      return false;
    }

    const fieldParts = f.split('.');
    const lastPart = fieldParts.pop();
    if (lastPart === 'keyword' && allFields.includes(fieldParts.join('.'))) {
      return false;
    }

    return true;
  });

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<EsFieldName[]>([]);

  useEffect(() => {
    setVisibleColumns(indexPatternFields.splice(0, INIT_MAX_COLUMNS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexPatternFields.join()]);

  const {
    errorMessage,
    pagination,
    setPagination,
    setSortingColumns,
    rowCount,
    sortingColumns,
    status,
    tableItems: data,
  } = useSourceIndexData(indexPattern, query);

  // EuiDataGrid State
  const dataGridColumns = [
    ...indexPatternFields.map((id) => {
      const field = indexPattern.fields.getByName(id);

      // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
      // To fall back to the default string schema it needs to be undefined.
      let schema;

      switch (field?.type) {
        case KBN_FIELD_TYPES.BOOLEAN:
          schema = 'boolean';
          break;
        case KBN_FIELD_TYPES.DATE:
          schema = 'datetime';
          break;
        case KBN_FIELD_TYPES.GEO_POINT:
        case KBN_FIELD_TYPES.GEO_SHAPE:
          schema = 'json';
          break;
        case KBN_FIELD_TYPES.NUMBER:
          schema = 'numeric';
          break;
      }

      return { id, schema };
    }),
  ];

  const onSort = useCallback(
    (sc: Array<{ id: string; direction: 'asc' | 'desc' }>) => {
      // Check if an unsupported column type for sorting was selected.
      const invalidSortingColumnns = sc.reduce<string[]>((arr, current) => {
        const columnType = dataGridColumns.find((dgc) => dgc.id === current.id);
        if (columnType?.schema === 'json') {
          arr.push(current.id);
        }
        return arr;
      }, []);
      if (invalidSortingColumnns.length === 0) {
        setSortingColumns(sc);
      } else {
        invalidSortingColumnns.forEach((columnId) => {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.sourceIndexPreview.invalidSortingColumnError', {
              defaultMessage: `The column '{columnId}' cannot be used for sorting.`,
              values: { columnId },
            })
          );
        });
      }
    },
    [dataGridColumns, setSortingColumns, toastNotifications]
  );

  const onChangeItemsPerPage = useCallback(
    (pageSize) => {
      setPagination((p) => {
        const pageIndex = Math.floor((p.pageSize * p.pageIndex) / pageSize);
        return { pageIndex, pageSize };
      });
    },
    [setPagination]
  );

  const onChangePage = useCallback((pageIndex) => setPagination((p) => ({ ...p, pageIndex })), [
    setPagination,
  ]);

  const renderCellValue = useMemo(() => {
    return ({
      rowIndex,
      columnId,
      setCellProps,
    }: {
      rowIndex: number;
      columnId: string;
      setCellProps: any;
    }) => {
      const adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;

      const cellValue = data.hasOwnProperty(adjustedRowIndex)
        ? getNestedProperty(data[adjustedRowIndex], columnId, null)
        : null;

      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }

      if (cellValue === undefined || cellValue === null) {
        return null;
      }

      const field = indexPattern.fields.getByName(columnId);
      if (field?.type === KBN_FIELD_TYPES.DATE) {
        return formatHumanReadableDateTimeSeconds(moment(cellValue).unix() * 1000);
      }

      if (field?.type === KBN_FIELD_TYPES.BOOLEAN) {
        return cellValue ? 'true' : 'false';
      }

      return cellValue;
    };
  }, [data, indexPattern.fields, pagination.pageIndex, pagination.pageSize]);

  if (status === SOURCE_INDEX_STATUS.LOADED && data.length === 0) {
    return (
      <div data-test-subj="transformSourceIndexPreview empty">
        <SourceIndexPreviewTitle indexPatternTitle={indexPattern.title} />
        <EuiCallOut
          title={i18n.translate(
            'xpack.transform.sourceIndexPreview.SourceIndexNoDataCalloutTitle',
            {
              defaultMessage: 'Empty source index query result.',
            }
          )}
          color="primary"
        >
          <p>
            {i18n.translate('xpack.transform.sourceIndexPreview.SourceIndexNoDataCalloutBody', {
              defaultMessage:
                'The query for the source index returned no results. Please make sure you have sufficient permissions, the index contains documents and your query is not too restrictive.',
            })}
          </p>
        </EuiCallOut>
      </div>
    );
  }

  const euiCopyText = i18n.translate('xpack.transform.sourceIndexPreview.copyClipboardTooltip', {
    defaultMessage: 'Copy Dev Console statement of the source index preview to the clipboard.',
  });

  return (
    <div
      data-test-subj={`transformSourceIndexPreview ${
        status === SOURCE_INDEX_STATUS.ERROR ? 'error' : 'loaded'
      }`}
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <SourceIndexPreviewTitle indexPatternTitle={indexPattern.title} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy
            beforeMessage={euiCopyText}
            textToCopy={getSourceIndexDevConsoleStatement(query, indexPattern.title)}
          >
            {(copy: () => void) => (
              <EuiButtonIcon onClick={copy} iconType="copyClipboard" aria-label={euiCopyText} />
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div className="transform__progress">
        {status === SOURCE_INDEX_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
        {status !== SOURCE_INDEX_STATUS.LOADING && (
          <EuiProgress size="xs" color="accent" max={1} value={0} />
        )}
      </div>
      {status === SOURCE_INDEX_STATUS.ERROR && (
        <div data-test-subj="transformSourceIndexPreview error">
          <EuiCallOut
            title={i18n.translate('xpack.transform.sourceIndexPreview.sourceIndexPatternError', {
              defaultMessage: 'An error occurred loading the source index data.',
            })}
            color="danger"
            iconType="cross"
          >
            <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
              {errorMessage}
            </EuiCodeBlock>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </div>
      )}
      <EuiDataGrid
        aria-label="Source index preview"
        columns={dataGridColumns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        gridStyle={euiDataGridStyle}
        rowCount={rowCount}
        renderCellValue={renderCellValue}
        sorting={{ columns: sortingColumns, onSort }}
        toolbarVisibility={euiDataGridToolbarSettings}
        pagination={{
          ...pagination,
          pageSizeOptions: [5, 10, 25],
          onChangeItemsPerPage,
          onChangePage,
        }}
      />
    </div>
  );
});
