/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, FC } from 'react';

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
import { euiDataGridStyle, euiDataGridToolbarSettings } from '../../common';

import { IndexPreviewTitle } from './index_preview_title';
import { INDEX_STATUS, UseIndexDataReturnType } from './types';

interface PropsWithHeader extends UseIndexDataReturnType {
  copyToClipboard: string;
  copyToClipboardDescription: string;
  dataTestSubj: string;
  title: string;
}

interface PropsWithoutHeader extends UseIndexDataReturnType {
  dataTestSubj: string;
}

function isWithHeader(arg: any): arg is PropsWithHeader {
  return typeof arg?.title === 'string' && arg?.title !== '';
}

type Props = PropsWithHeader | PropsWithoutHeader;

export const IndexPreview: FC<Props> = props => {
  const {
    columns,
    dataTestSubj,
    errorMessage,
    invalidSortingColumnns,
    noDataMessage,
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
  } = props;

  const toastNotifications = useToastNotifications();

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
      <div data-test-subj={`${dataTestSubj} empty`}>
        {isWithHeader(props) && <IndexPreviewTitle indexPreviewTitle={props.title} />}
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

  if (noDataMessage !== '') {
    return (
      <div data-test-subj={`${dataTestSubj} empty`}>
        {isWithHeader(props) && <IndexPreviewTitle indexPreviewTitle={props.title} />}
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

  return (
    <div data-test-subj={`${dataTestSubj} ${status === INDEX_STATUS.ERROR ? 'error' : 'loaded'}`}>
      {isWithHeader(props) && (
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem>
            <IndexPreviewTitle indexPreviewTitle={props.title} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy
              beforeMessage={props.copyToClipboardDescription}
              textToCopy={props.copyToClipboard}
            >
              {(copy: () => void) => (
                <EuiButtonIcon
                  onClick={copy}
                  iconType="copyClipboard"
                  aria-label={props.copyToClipboardDescription}
                />
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <div className="transform__progress">
        {status === INDEX_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
        {status !== INDEX_STATUS.LOADING && (
          <EuiProgress size="xs" color="accent" max={1} value={0} />
        )}
      </div>
      {status === INDEX_STATUS.ERROR && (
        <div data-test-subj={`${dataTestSubj} error`}>
          <EuiCallOut
            title={i18n.translate('xpack.transform.indexPreview.indexDataError', {
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
        aria-label={isWithHeader(props) ? props.title : ''}
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
};
