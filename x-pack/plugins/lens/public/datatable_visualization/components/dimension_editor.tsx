/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch, EuiButtonGroup, htmlIdGenerator } from '@elastic/eui';
import { VisualizationDimensionEditorProps } from '../../types';
import { DatatableVisualizationState } from '../visualization';

const idPrefix = htmlIdGenerator()();

export function TableDimensionEditor(
  props: VisualizationDimensionEditorProps<DatatableVisualizationState>
) {
  const { state, setState, frame, accessor } = props;
  const column = state.columns.find(({ columnId }) => accessor === columnId);

  if (!column) return null;

  // either read config state or use same logic as chart itself
  const currentAlignment =
    column?.alignment ||
    (frame.activeData &&
    frame.activeData[state.layerId].columns.find((col) => col.id === accessor)?.meta.type ===
      'number'
      ? 'right'
      : 'left');

  const visibleColumnsCount = state.columns.filter((c) => !c.hidden).length;

  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.table.alignment.label', {
          defaultMessage: 'Text alignment',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.table.alignment.label', {
            defaultMessage: 'Text alignment',
          })}
          data-test-subj="lnsDatatable_alignment_groups"
          name="alignment"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}left`,
              label: i18n.translate('xpack.lens.xyChart.axisSide.left', {
                defaultMessage: 'Left',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_left',
            },
            {
              id: `${idPrefix}center`,
              label: i18n.translate('xpack.lens.table.alignment.center', {
                defaultMessage: 'Center',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_center',
            },
            {
              id: `${idPrefix}right`,
              label: i18n.translate('xpack.lens.table.alignment.right', {
                defaultMessage: 'Right',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_right',
            },
          ]}
          idSelected={`${idPrefix}${currentAlignment}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as 'left' | 'right' | 'center';
            const newColumns = state.columns.map((currentColumn) => {
              if (currentColumn.columnId === accessor) {
                return {
                  ...currentColumn,
                  alignment: newMode,
                };
              } else {
                return currentColumn;
              }
            });
            setState({ ...state, columns: newColumns });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.lens.table.columnVisibilityLabel', {
          defaultMessage: 'Column hidden in table',
        })}
        display="columnCompressedSwitch"
      >
        <EuiSwitch
          compressed
          label={i18n.translate('xpack.lens.table.columnVisibilityLabel', {
            defaultMessage: 'Column hidden in table',
          })}
          showLabel={false}
          data-test-subj="lns-table-column-hidden"
          checked={Boolean(column?.hidden)}
          disabled={!column.hidden && visibleColumnsCount <= 1}
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
    </>
  );
}
