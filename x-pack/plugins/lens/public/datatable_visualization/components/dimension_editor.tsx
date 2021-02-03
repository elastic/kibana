/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSwitch, EuiFormRow } from '@elastic/eui';
import { VisualizationDimensionEditorProps } from '../../types';
import { DatatableVisualizationState } from '../visualization';

export function TableDimensionEditor(
  props: VisualizationDimensionEditorProps<DatatableVisualizationState>
) {
  const { state, setState, accessor } = props;
  const column = state.columns.find((c) => c.columnId === accessor);

  if (!column) {
    return null;
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.table.columnVisibilityLabel', {
        defaultMessage: 'Column hidden in table',
      })}
      display="columnCompressedSwitch"
    >
      <EuiSwitch
        compressed
        label={i18n.translate('xpack.lens.table.columnVisibilityLabel', {
          defaultMessage: 'Column hidden',
        })}
        showLabel={false}
        data-test-subj="lns-table-column-hidden"
        checked={Boolean(column?.hidden)}
        onChange={() => {
          const newState = {
            ...state,
            columns: state.columns.map((currentColumn) => {
              if (currentColumn.columnId === accessor) {
                return {
                  ...currentColumn,
                  hidden: !column.hidden,
                };
              } else {
                return currentColumn;
              }
            }),
          };
          setState(newState);
        }}
      />
    </EuiFormRow>
  );
}
