/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiFormRow, EuiFieldText, EuiText, useEuiTheme, EuiComboBox } from '@elastic/eui';
import { PaletteRegistry } from '@kbn/coloring';
import type { VisualizationDimensionEditorProps } from '../../../types';
import type { DatatableVisualizationState } from '../visualization';

import { useDebouncedValue } from '../../../shared_components';
import type { ColumnState } from '../../../../common/expressions';

import {
  getDefaultSummaryLabel,
  getFinalSummaryConfiguration,
  getSummaryRowOptions,
} from '../../../../common/expressions/datatable/summary';

import { isNumericFieldForDatatable } from '../../../../common/expressions/datatable/utils';

import './dimension_editor.scss';

type ColumnType = DatatableVisualizationState['columns'][number];
type SummaryRowType = Extract<ColumnState['summaryRow'], string>;

function updateColumnWith(
  state: DatatableVisualizationState,
  columnId: string,
  newColumnProps: Partial<ColumnType>
) {
  return state.columns.map((currentColumn) => {
    if (currentColumn.columnId === columnId) {
      return { ...currentColumn, ...newColumnProps };
    } else {
      return currentColumn;
    }
  });
}

export function TableDimensionEditorAdditionalSection(
  props: VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, frame, accessor } = props;
  const column = state.columns.find(({ columnId }) => accessor === columnId);
  const onSummaryLabelChangeToDebounce = useCallback(
    (newSummaryLabel: string | undefined) => {
      setState({
        ...state,
        columns: updateColumnWith(state, accessor, { summaryLabel: newSummaryLabel }),
      });
    },
    [accessor, setState, state]
  );
  const { inputValue: summaryLabel, handleInputChange: onSummaryLabelChange } = useDebouncedValue<
    string | undefined
  >(
    {
      onChange: onSummaryLabelChangeToDebounce,
      value: column?.summaryLabel,
    },
    { allowFalsyValue: true } // falsy values are valid for this feature
  );

  const { euiTheme } = useEuiTheme();

  if (!column) return null;
  if (column.isTransposed) return null;

  const currentData = frame.activeData?.[state.layerId];

  // either read config state or use same logic as chart itself
  const isNumeric = isNumericFieldForDatatable(currentData, accessor);
  // when switching from one operation to another, make sure to keep the configuration consistent
  const { summaryRow, summaryLabel: fallbackSummaryLabel } = getFinalSummaryConfiguration(
    accessor,
    column,
    currentData
  );

  return (
    <>
      {isNumeric && (
        <div className="lnsIndexPatternDimensionEditor--padded lnsIndexPatternDimensionEditor--collapseNext">
          <EuiText
            size="s"
            css={css`
              margin-bottom: ${euiTheme.size.base};
            `}
          >
            <h4>
              {i18n.translate('xpack.lens.indexPattern.dimensionEditor.headingSummary', {
                defaultMessage: 'Summary',
              })}
            </h4>
          </EuiText>

          <>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.lens.table.summaryRow.label', {
                defaultMessage: 'Summary Row',
              })}
              display="columnCompressed"
            >
              <EuiComboBox
                fullWidth
                compressed
                isClearable={false}
                data-test-subj="lnsDatatable_summaryrow_function"
                placeholder={i18n.translate('xpack.lens.indexPattern.fieldPlaceholder', {
                  defaultMessage: 'Field',
                })}
                options={getSummaryRowOptions()}
                selectedOptions={[
                  {
                    label: getDefaultSummaryLabel(summaryRow),
                    value: summaryRow,
                  },
                ]}
                singleSelection={{ asPlainText: true }}
                onChange={(choices) => {
                  const newValue = choices[0].value as SummaryRowType;
                  setState({
                    ...state,
                    columns: updateColumnWith(state, accessor, { summaryRow: newValue }),
                  });
                }}
              />
            </EuiFormRow>
            {summaryRow !== 'none' && (
              <EuiFormRow
                display="columnCompressed"
                fullWidth
                label={i18n.translate('xpack.lens.table.summaryRow.customlabel', {
                  defaultMessage: 'Summary label',
                })}
              >
                <EuiFieldText
                  fullWidth
                  compressed
                  data-test-subj="lnsDatatable_summaryrow_label"
                  value={summaryLabel ?? fallbackSummaryLabel}
                  onChange={(e) => {
                    onSummaryLabelChange(e.target.value);
                  }}
                />
              </EuiFormRow>
            )}
          </>
        </div>
      )}
    </>
  );
}
