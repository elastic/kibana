/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiCopy,
  EuiDataGrid,
  EuiDataGridSorting,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiTitle,
} from '@elastic/eui';

import { ES_FIELD_TYPES } from '../../../../../../../src/plugins/data/common';

import { dictionaryToArray } from '../../../../common/types/common';
import { formatHumanReadableDateTimeSeconds } from '../../../../common/utils/date_utils';
import { getNestedProperty } from '../../../../common/utils/object_utils';

import {
  euiDataGridStyle,
  euiDataGridToolbarSettings,
  EsFieldName,
  PreviewRequestBody,
  PivotAggsConfigDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  PivotQuery,
  INIT_MAX_COLUMNS,
} from '../../common';
import { SearchItems } from '../../hooks/use_search_items';

import { getPivotPreviewDevConsoleStatement, multiColumnSortFactory } from './common';
import { PIVOT_PREVIEW_STATUS, usePivotPreviewData } from './use_pivot_preview_data';

function sortColumns(groupByArr: PivotGroupByConfig[]) {
  return (a: string, b: string) => {
    // make sure groupBy fields are always most left columns
    if (groupByArr.some((d) => d.aggName === a) && groupByArr.some((d) => d.aggName === b)) {
      return a.localeCompare(b);
    }
    if (groupByArr.some((d) => d.aggName === a)) {
      return -1;
    }
    if (groupByArr.some((d) => d.aggName === b)) {
      return 1;
    }
    return a.localeCompare(b);
  };
}

interface PreviewTitleProps {
  previewRequest: PreviewRequestBody;
}

const PreviewTitle: FC<PreviewTitleProps> = ({ previewRequest }) => {
  const euiCopyText = i18n.translate('xpack.transform.pivotPreview.copyClipboardTooltip', {
    defaultMessage: 'Copy Dev Console statement of the pivot preview to the clipboard.',
  });

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <span>
            {i18n.translate('xpack.transform.pivotPreview.PivotPreviewTitle', {
              defaultMessage: 'Transform pivot preview',
            })}
          </span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy
          beforeMessage={euiCopyText}
          textToCopy={getPivotPreviewDevConsoleStatement(previewRequest)}
        >
          {(copy: () => void) => (
            <EuiButtonIcon onClick={copy} iconType="copyClipboard" aria-label={euiCopyText} />
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: FC<ErrorMessageProps> = ({ message }) => (
  <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
    {message}
  </EuiCodeBlock>
);

interface PivotPreviewProps {
  aggs: PivotAggsConfigDict;
  groupBy: PivotGroupByConfigDict;
  indexPatternTitle: SearchItems['indexPattern']['title'];
  query: PivotQuery;
  showHeader?: boolean;
}

const defaultPagination = { pageIndex: 0, pageSize: 5 };

export const PivotPreview: FC<PivotPreviewProps> = React.memo(
  ({ aggs, groupBy, indexPatternTitle, query, showHeader = true }) => {
    const {
      previewData: data,
      previewMappings,
      errorMessage,
      previewRequest,
      status,
    } = usePivotPreviewData(indexPatternTitle, query, aggs, groupBy);
    const groupByArr = dictionaryToArray(groupBy);

    // Filters mapping properties of type `object`, which get returned for nested field parents.
    const columnKeys = Object.keys(previewMappings.properties).filter(
      (key) => previewMappings.properties[key].type !== 'object'
    );
    columnKeys.sort(sortColumns(groupByArr));

    // Column visibility
    const [visibleColumns, setVisibleColumns] = useState<EsFieldName[]>([]);

    useEffect(() => {
      setVisibleColumns(columnKeys.splice(0, INIT_MAX_COLUMNS));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columnKeys.join()]);

    const [pagination, setPagination] = useState(defaultPagination);

    // Reset pagination if data changes. This is to avoid ending up with an empty table
    // when for example the user selected a page that is not available with the updated data.
    useEffect(() => {
      setPagination(defaultPagination);
    }, [data.length]);

    // EuiDataGrid State
    const dataGridColumns = columnKeys.map((id) => {
      const field = previewMappings.properties[id];

      // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
      // To fall back to the default string schema it needs to be undefined.
      let schema;

      switch (field?.type) {
        case ES_FIELD_TYPES.GEO_POINT:
        case ES_FIELD_TYPES.GEO_SHAPE:
          schema = 'json';
          break;
        case ES_FIELD_TYPES.BOOLEAN:
          schema = 'boolean';
          break;
        case ES_FIELD_TYPES.DATE:
        case ES_FIELD_TYPES.DATE_NANOS:
          schema = 'datetime';
          break;
        case ES_FIELD_TYPES.BYTE:
        case ES_FIELD_TYPES.DOUBLE:
        case ES_FIELD_TYPES.FLOAT:
        case ES_FIELD_TYPES.HALF_FLOAT:
        case ES_FIELD_TYPES.INTEGER:
        case ES_FIELD_TYPES.LONG:
        case ES_FIELD_TYPES.SCALED_FLOAT:
        case ES_FIELD_TYPES.SHORT:
          schema = 'numeric';
          break;
        // keep schema undefined for text based columns
        case ES_FIELD_TYPES.KEYWORD:
        case ES_FIELD_TYPES.TEXT:
          break;
      }

      return { id, schema };
    });

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

    // Sorting config
    const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);
    const onSort = useCallback((sc) => setSortingColumns(sc), [setSortingColumns]);

    if (sortingColumns.length > 0) {
      data.sort(multiColumnSortFactory(sortingColumns));
    }

    const pageData = data.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize
    );

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

        const cellValue = pageData.hasOwnProperty(adjustedRowIndex)
          ? getNestedProperty(pageData[adjustedRowIndex], columnId, null)
          : null;

        if (typeof cellValue === 'object' && cellValue !== null) {
          return JSON.stringify(cellValue);
        }

        if (cellValue === undefined || cellValue === null) {
          return null;
        }

        if (
          [ES_FIELD_TYPES.DATE, ES_FIELD_TYPES.DATE_NANOS].includes(
            previewMappings.properties[columnId].type
          )
        ) {
          return formatHumanReadableDateTimeSeconds(moment(cellValue).unix() * 1000);
        }

        if (previewMappings.properties[columnId].type === ES_FIELD_TYPES.BOOLEAN) {
          return cellValue ? 'true' : 'false';
        }

        return cellValue;
      };
    }, [pageData, pagination.pageIndex, pagination.pageSize, previewMappings.properties]);

    if (status === PIVOT_PREVIEW_STATUS.ERROR) {
      return (
        <div data-test-subj="transformPivotPreview error">
          <PreviewTitle previewRequest={previewRequest} />
          <EuiCallOut
            title={i18n.translate('xpack.transform.pivotPreview.PivotPreviewError', {
              defaultMessage: 'An error occurred loading the pivot preview.',
            })}
            color="danger"
            iconType="cross"
          >
            <ErrorMessage message={errorMessage} />
          </EuiCallOut>
        </div>
      );
    }

    if (data.length === 0) {
      let noDataMessage = i18n.translate(
        'xpack.transform.pivotPreview.PivotPreviewNoDataCalloutBody',
        {
          defaultMessage:
            'The preview request did not return any data. Please ensure the optional query returns data and that values exist for the field used by group-by and aggregation fields.',
        }
      );

      const aggsArr = dictionaryToArray(aggs);
      if (aggsArr.length === 0 || groupByArr.length === 0) {
        noDataMessage = i18n.translate(
          'xpack.transform.pivotPreview.PivotPreviewIncompleteConfigCalloutBody',
          {
            defaultMessage: 'Please choose at least one group-by field and aggregation.',
          }
        );
      }

      return (
        <div data-test-subj="transformPivotPreview empty">
          <PreviewTitle previewRequest={previewRequest} />
          <EuiCallOut
            title={i18n.translate('xpack.transform.pivotPreview.PivotPreviewNoDataCalloutTitle', {
              defaultMessage: 'Pivot preview not available',
            })}
            color="primary"
          >
            <p>{noDataMessage}</p>
          </EuiCallOut>
        </div>
      );
    }

    if (columnKeys.length === 0) {
      return null;
    }

    return (
      <div data-test-subj="transformPivotPreview loaded">
        {showHeader && (
          <>
            <PreviewTitle previewRequest={previewRequest} />
            <div className="transform__progress">
              {status === PIVOT_PREVIEW_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
              {status !== PIVOT_PREVIEW_STATUS.LOADING && (
                <EuiProgress size="xs" color="accent" max={1} value={0} />
              )}
            </div>
          </>
        )}
        {dataGridColumns.length > 0 && data.length > 0 && (
          <EuiDataGrid
            aria-label="Source index preview"
            columns={dataGridColumns}
            columnVisibility={{ visibleColumns, setVisibleColumns }}
            gridStyle={euiDataGridStyle}
            rowCount={data.length}
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
        )}
      </div>
    );
  }
);
