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
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { CoreSetup } from 'src/core/public';

import { INDEX_STATUS } from '../../data_frame_analytics/common';

import { euiDataGridStyle, euiDataGridToolbarSettings } from './common';
import { UseIndexDataReturnType } from './types';

export const DataGridTitle: FC<{ title: string }> = ({ title }) => (
  <EuiTitle size="xs">
    <span>{title}</span>
  </EuiTitle>
);

interface PropsWithoutHeader extends UseIndexDataReturnType {
  dataTestSubj: string;
  toastNotifications: CoreSetup['notifications']['toasts'];
}

interface PropsWithHeader extends PropsWithoutHeader {
  copyToClipboard: string;
  copyToClipboardDescription: string;
  title: string;
}

function isWithHeader(arg: any): arg is PropsWithHeader {
  return typeof arg?.title === 'string' && arg?.title !== '';
}

type Props = PropsWithHeader | PropsWithoutHeader;

export const DataGrid: FC<Props> = props => {
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
    toastNotifications,
    visibleColumns,
  } = props;

  useEffect(() => {
    if (invalidSortingColumnns.length > 0) {
      invalidSortingColumnns.forEach(columnId => {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataGrid.invalidSortingColumnError', {
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
        {isWithHeader(props) && <DataGridTitle title={props.title} />}
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataGrid.IndexNoDataCalloutTitle', {
            defaultMessage: 'Empty index query result.',
          })}
          color="primary"
        >
          <p>
            {i18n.translate('xpack.ml.dataGrid.IndexNoDataCalloutBody', {
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
        {isWithHeader(props) && <DataGridTitle title={props.title} />}
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataGrid.dataGridNoDataCalloutTitle', {
            defaultMessage: 'Index preview not available',
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
            <DataGridTitle title={props.title} />
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
      {status === INDEX_STATUS.ERROR && (
        <div data-test-subj={`${dataTestSubj} error`}>
          <EuiCallOut
            title={i18n.translate('xpack.ml.dataGrid.indexDataError', {
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
