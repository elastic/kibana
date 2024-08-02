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
import { LogDocument } from '@kbn/discover-utils/src';
import { LogsExplorerControllerStateService } from '../state_machines/logs_explorer_controller';
import {
  degradedDocButtonLabelWhenNotPresent,
  degradedDocButtonLabelWhenPresent,
  stacktraceAvailableControlButton,
  stacktraceNotAvailableControlButton,
} from '../components/common/translations';
import * as constants from '../../common/constants';
import { getStacktraceFields } from '../utils/get_stack_trace';
import { ActionsColumnTooltip } from '../components/virtual_columns/column_tooltips/actions_column_tooltip';

const ConnectedDegradedDocs = ({
  rowIndex,
  service,
}: {
  rowIndex: number;
  service: LogsExplorerControllerStateService;
}) => {
  const [state] = useActor(service);
  if (state.matches('initialized') && state.context.rows[rowIndex]) {
    return <DegradedDocs row={state.context.rows[rowIndex]} rowIndex={rowIndex} />;
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
  if (state.matches('initialized') && state.context.rows[rowIndex]) {
    return <Stacktrace row={state.context.rows[rowIndex]} rowIndex={rowIndex} />;
  }

  return null;
};

const DegradedDocs = ({ row, rowIndex }: { row: DataTableRecord; rowIndex: number }) => {
  const isDegradedDocumentExists = constants.DEGRADED_DOCS_FIELD in row.raw;

  return isDegradedDocumentExists ? (
    <DataTableRowControl>
      <EuiToolTip content={degradedDocButtonLabelWhenPresent} delay="long">
        <EuiButtonIcon
          id={`degradedDocExists_${rowIndex}`}
          size="xs"
          iconSize="s"
          data-test-subj={'docTableDegradedDocExist'}
          color={'danger'}
          aria-label={degradedDocButtonLabelWhenPresent}
          iconType={'indexClose'}
        />
      </EuiToolTip>
    </DataTableRowControl>
  ) : (
    <DataTableRowControl>
      <EuiToolTip content={degradedDocButtonLabelWhenNotPresent} delay="long">
        <EuiButtonIcon
          id={`degradedDocExists_${rowIndex}`}
          size="xs"
          iconSize="s"
          data-test-subj={'docTableDegradedDocDoesNotExist'}
          color={'text'}
          iconType={'pagesSelect'}
          aria-label={degradedDocButtonLabelWhenNotPresent}
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
            <ConnectedDegradedDocs rowIndex={rowIndex} service={service} />
            <ConnectedStacktraceDocs rowIndex={rowIndex} service={service} />
          </span>
        );
      },
    };

    return {
      leadingControlColumns: [checkBoxColumn, actionsColumn],
    };
  };
