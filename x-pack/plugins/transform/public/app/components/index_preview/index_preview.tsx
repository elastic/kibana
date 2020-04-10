/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

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
} from '@elastic/eui';

import { useToastNotifications } from '../../app_dependencies';
import { euiDataGridStyle, euiDataGridToolbarSettings, PivotQuery } from '../../common';
import { SearchItems } from '../../hooks/use_search_items';

import { getIndexDevConsoleStatement } from './common';
import { IndexPreviewTitle } from './index_preview_title';
import { INDEX_STATUS, useIndexData } from './use_index_data';

interface Props {
  indexPattern: SearchItems['indexPattern'];
  query: PivotQuery;
  title: string;
}

export const IndexPreview: React.FC<Props> = React.memo(({ indexPattern, query, title }) => {
  const toastNotifications = useToastNotifications();

  const {
    columns,
    errorMessage,
    invalidSortingColumnns,
    onChangeItemsPerPage,
    onChangePage,
    onSort,
    pagination,
    setVisibleColumns,
    renderCellValue,
    rowCount,
    sortingColumns,
    status,
    tableItems: data,
    visibleColumns,
  } = useIndexData(indexPattern, query);

  useEffect(() => {
    if (invalidSortingColumnns.length > 0) {
      invalidSortingColumnns.forEach(columnId => {
        toastNotifications.addDanger(
          i18n.translate('xpack.transform.indexPreview.invalidSortingColumnError', {
            defaultMessage: `The column '{columnId}' cannot be used for sorting.`,
            values: { columnId },
          })
        );
      });
    }
  }, [invalidSortingColumnns, toastNotifications]);

  if (status === INDEX_STATUS.LOADED && data.length === 0) {
    return (
      <div data-test-subj="transformIndexPreview empty">
        <IndexPreviewTitle indexPreviewTitle={title} />
        <EuiCallOut
          title={i18n.translate('xpack.transform.indexPreview.IndexNoDataCalloutTitle', {
            defaultMessage: 'Empty index query result.',
          })}
          color="primary"
        >
          <p>
            {i18n.translate('xpack.transform.indexPreview.IndexNoDataCalloutBody', {
              defaultMessage:
                'The query for the index returned no results. Please make sure you have sufficient permissions, the index contains documents and your query is not too restrictive.',
            })}
          </p>
        </EuiCallOut>
      </div>
    );
  }

  const euiCopyText = i18n.translate('xpack.transform.indexPreview.copyClipboardTooltip', {
    defaultMessage: 'Copy Dev Console statement of the index preview to the clipboard.',
  });

  return (
    <div
      data-test-subj={`transformIndexPreview ${status === INDEX_STATUS.ERROR ? 'error' : 'loaded'}`}
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <IndexPreviewTitle indexPreviewTitle={title} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy
            beforeMessage={euiCopyText}
            textToCopy={getIndexDevConsoleStatement(query, indexPattern.title)}
          >
            {(copy: () => void) => (
              <EuiButtonIcon onClick={copy} iconType="copyClipboard" aria-label={euiCopyText} />
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div className="transform__progress">
        {status === INDEX_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
        {status !== INDEX_STATUS.LOADING && (
          <EuiProgress size="xs" color="accent" max={1} value={0} />
        )}
      </div>
      {status === INDEX_STATUS.ERROR && (
        <div data-test-subj="transformIndexPreview error">
          <EuiCallOut
            title={i18n.translate('xpack.transform.indexPreview.indexPatternError', {
              defaultMessage: 'An error occurred loading the index data.',
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
        aria-label={title}
        columns={columns}
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
