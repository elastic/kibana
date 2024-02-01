/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ControlColumnsProps } from '@kbn/unified-data-table';
import { OPEN_DETAILS } from '@kbn/unified-data-table';
import React, { ComponentClass } from 'react';
import { EuiButtonIcon, EuiDataGridCellValueElementProps, EuiToolTip } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/src/types';
import { DataTableRowControl } from '@kbn/unified-data-table';
import {
  malformedDocButtonLabelWhenNotPresent,
  malformedDocButtonLabelWhenPresent,
  stacktraceAvailableControlButton,
  stacktraceNotAvailableControlButton,
} from '../components/common/translations';
import * as constants from '../../common/constants';
import { getStacktraceFields } from '../utils/get_stack_trace';
import { LogDocument } from '../../common/document';
import { ActionsColumnTooltip } from '../components/virtual_columns/column_tooltips/actions_column_tooltip';

const MalformedDocs = ({ row, rowIndex }: { row: DataTableRecord; rowIndex: number }) => {
  const isMalformedDocumentExists = !!row.raw[constants.MALFORMED_DOCS_FIELD];

  return isMalformedDocumentExists ? (
    <DataTableRowControl>
      <EuiToolTip content={malformedDocButtonLabelWhenPresent} delay="long">
        <EuiButtonIcon
          id={`malformedDocExists_${rowIndex}`}
          size="xs"
          iconSize="s"
          data-test-subj={`malformedDocExists_${rowIndex}`}
          color={'danger'}
          aria-label={malformedDocButtonLabelWhenPresent}
          iconType={'indexClose'}
        />
      </EuiToolTip>
    </DataTableRowControl>
  ) : (
    <DataTableRowControl>
      <EuiToolTip content={malformedDocButtonLabelWhenNotPresent} delay="long">
        <EuiButtonIcon
          id={`malformedDocExists_${rowIndex}`}
          size="xs"
          iconSize="s"
          data-test-subj={`malformedDocExists_${rowIndex}`}
          color={'text'}
          iconType={'pagesSelect'}
          aria-label={malformedDocButtonLabelWhenNotPresent}
        />
      </EuiToolTip>
    </DataTableRowControl>
  );
};

const Stacktrace = ({ row, rowIndex }: { row: DataTableRecord; rowIndex: number }) => {
  const stacktrace = getStacktraceFields(row as LogDocument);
  const hasValue = Object.values(stacktrace).some((value) => value);

  return (
    <DataTableRowControl>
      <EuiToolTip
        content={hasValue ? stacktraceAvailableControlButton : stacktraceNotAvailableControlButton}
        delay="long"
      >
        <EuiButtonIcon
          id={`stacktrace_${rowIndex}`}
          size="xs"
          iconSize="s"
          data-test-subj={`stacktrace_${rowIndex}`}
          color={'text'}
          iconType={'apmTrace'}
          aria-label={
            hasValue ? stacktraceAvailableControlButton : stacktraceNotAvailableControlButton
          }
          disabled={!hasValue}
        />
      </EuiToolTip>
    </DataTableRowControl>
  );
};

export const createCustomControlColumnsConfiguration = ({
  leadingControlColumns,
  trailingControlColumns,
  rows,
}: ControlColumnsProps) => {
  const customLeadingColumnWithoutOpenDetails = leadingControlColumns.filter(
    (column) => column.id !== OPEN_DETAILS
  );

  const openDetails = leadingControlColumns.find((column) => column.id === OPEN_DETAILS);
  if (openDetails && rows) {
    const ExpandButton =
      openDetails.rowCellRender as ComponentClass<EuiDataGridCellValueElementProps>;
    const actionsColumn = {
      id: 'actionsColumn',
      width: constants.ACTIONS_COLUMN_WIDTH,
      headerCellRender: ActionsColumnTooltip,
      rowCellRender: ({ rowIndex, setCellProps, ...rest }: EuiDataGridCellValueElementProps) => (
        <span>
          <ExpandButton rowIndex={rowIndex} setCellProps={setCellProps} {...rest} />
          <MalformedDocs row={rows[rowIndex]} rowIndex={rowIndex} />
          <Stacktrace row={rows[rowIndex]} rowIndex={rowIndex} />
        </span>
      ),
    };

    return {
      leadingControlColumns: customLeadingColumnWithoutOpenDetails,
      trailingControlColumns: [actionsColumn],
    };
  }

  return {
    leadingControlColumns,
    trailingControlColumns,
  };
};
