/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentClass } from 'react';
import {
  OPEN_DETAILS,
  SELECT_ROW,
  type ControlColumnsProps,
  DataTableRowControl,
} from '@kbn/unified-data-table';
import { EuiButtonIcon, EuiDataGridCellValueElementProps, EuiToolTip } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/src/types';
import { useActor } from '@xstate/react';
import { LogsExplorerControllerStateService } from '../state_machines/logs_explorer_controller';
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

const ConnectedMalformedDocs = ({
  rowIndex,
  service,
}: {
  rowIndex: number;
  service: LogsExplorerControllerStateService;
}) => {
  const [state] = useActor(service);

  if (state.matches('initialized') && state.context.rows) {
    const row = state.context.rows[rowIndex];
    return <MalformedDocs row={row} rowIndex={rowIndex} />;
  }

  return null;
};

const ConnectedStacktraceDocs = ({
  rowIndex,
  service,
}: {
  rowIndex: number;
  service: LogsExplorerControllerStateService;
}) => {
  const [state] = useActor(service);

  if (state.matches('initialized') && state.context.rows) {
    const row = state.context.rows[rowIndex];
    return <Stacktrace row={row} rowIndex={rowIndex} />;
  }

  return null;
};

const MalformedDocs = ({ row, rowIndex }: { row: DataTableRecord; rowIndex: number }) => {
  const isMalformedDocumentExists = !!row.raw[constants.MALFORMED_DOCS_FIELD];

  return isMalformedDocumentExists ? (
    <DataTableRowControl>
      <EuiToolTip content={malformedDocButtonLabelWhenPresent} delay="long">
        <EuiButtonIcon
          id={`malformedDocExists_${rowIndex}`}
          size="xs"
          iconSize="s"
          data-test-subj={'docTableMalformedDocExist'}
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
          data-test-subj={'docTableMalformedDocDoesNotExist'}
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
          data-test-subj={hasValue ? 'docTableStacktraceExist' : 'docTableStacktraceDoesNotExist'}
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

export const createCustomControlColumnsConfiguration =
  (service: LogsExplorerControllerStateService) =>
  ({ controlColumns }: ControlColumnsProps) => {
    const checkBoxColumn = controlColumns[SELECT_ROW];
    const openDetails = controlColumns[OPEN_DETAILS];
    const ExpandButton =
      openDetails.rowCellRender as ComponentClass<EuiDataGridCellValueElementProps>;
    const actionsColumn = {
      id: 'actionsColumn',
      width: constants.ACTIONS_COLUMN_WIDTH,
      headerCellRender: ActionsColumnTooltip,
      rowCellRender: ({ rowIndex, setCellProps, ...rest }: EuiDataGridCellValueElementProps) => {
        return (
          <span>
            <ExpandButton rowIndex={rowIndex} setCellProps={setCellProps} {...rest} />
            <ConnectedMalformedDocs rowIndex={rowIndex} service={service} />
            <ConnectedStacktraceDocs rowIndex={rowIndex} service={service} />
          </span>
        );
      },
    };

    return {
      leadingControlColumns: [checkBoxColumn],
      trailingControlColumns: [actionsColumn],
    };
  };
