/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFlexGroup, EuiSwitch } from '@elastic/eui';
import { VisualizationToolbarProps } from '../../types';
import { ToolbarPopover } from '../../shared_components';
import { DatatableVisualizationState, ColumnState } from '../visualization';

export function TableToolbar(props: VisualizationToolbarProps<DatatableVisualizationState>) {
  const { state, setState, frame } = props;
  const columnMap: Record<string, ColumnState> = {};
  state.columns.forEach((column) => {
    columnMap[column.columnId] = column;
  });
  return (
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
      <ToolbarPopover
        title={i18n.translate('xpack.lens.table.columnsLabel', {
          defaultMessage: 'Toggle column visibility',
        })}
        type="list"
        groupPosition="none"
        buttonDataTestSubj="lnsColumnsButton"
      >
        <EuiFlexGroup gutterSize="m" direction="column">
          {frame.datasourceLayers[state.layerId].getTableSpec().map(({ columnId }) => {
            const label = props.frame.datasourceLayers[state.layerId].getOperationForColumnId(
              columnId
            )?.label;
            const isHidden = columnMap[columnId].hidden;
            return (
              <EuiFlexItem key={columnId}>
                <EuiSwitch
                  name={columnId}
                  label={label}
                  checked={!isHidden}
                  data-test-subj={`lnsColumns-toggle-${label?.replace(/ /g, '-')}`}
                  compressed
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newState = {
                      ...state,
                      columns: state.columns.map((currentColumn) => {
                        if (currentColumn.columnId === columnId) {
                          return {
                            ...currentColumn,
                            hidden: !isHidden,
                          };
                        } else {
                          return currentColumn;
                        }
                      }),
                    };
                    setState(newState);
                  }}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </ToolbarPopover>
    </EuiFlexGroup>
  );
}
