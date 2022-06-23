/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow, EuiRange, htmlIdGenerator, EuiSpacer } from '@elastic/eui';
import type { DatatableVisualizationState } from '../visualization';

export interface RowHeightSettingsProps {
  rowHeight?: 'auto' | 'single' | 'custom';
  rowHeightLines?: number;
  maxRowHeight?: number;
  label: string;
  onChangeRowHeight: (newHeightMode: 'auto' | 'single' | 'custom' | undefined) => void;
  onChangeRowHeightLines: (newRowHeightLines: number) => void;
  'data-test-subj'?: string;
}

const idPrefix = htmlIdGenerator()();

export function RowHeightSettings(props: RowHeightSettingsProps) {
  const {
    label,
    rowHeight,
    rowHeightLines,
    onChangeRowHeight,
    onChangeRowHeightLines,
    maxRowHeight,
  } = props;

  const rowHeightModeOptions = [
    {
      id: `${idPrefix}single`,
      label: i18n.translate('xpack.lens.table.rowHeight.single', {
        defaultMessage: 'Single',
      }),
      'data-test-subj': 'lnsDatatable_rowHeight_single',
    },
    {
      id: `${idPrefix}auto`,
      label: i18n.translate('xpack.lens.table.rowHeight.auto', {
        defaultMessage: 'Auto fit',
      }),
      'data-test-subj': 'lnsDatatable_rowHeight_auto',
    },
    {
      id: `${idPrefix}custom`,
      label: i18n.translate('xpack.lens.table.rowHeight.custom', {
        defaultMessage: 'Custom',
      }),
      'data-test-subj': 'lnsDatatable_rowHeight_custom',
    },
  ];

  return (
    <>
      <EuiFormRow label={label} display="columnCompressed" data-test-subj={props['data-test-subj']}>
        <>
          <EuiButtonGroup
            isFullWidth
            legend={label}
            name="legendLocation"
            buttonSize="compressed"
            options={rowHeightModeOptions}
            idSelected={`${idPrefix}${rowHeight ?? 'single'}`}
            onChange={(optionId) => {
              const newMode = optionId.replace(
                idPrefix,
                ''
              ) as DatatableVisualizationState['rowHeight'];
              onChangeRowHeight(newMode);
            }}
          />
          {rowHeight === 'custom' ? (
            <>
              <EuiSpacer size="xs" />
              <EuiRange
                compressed
                fullWidth
                showInput
                min={1}
                max={maxRowHeight ?? 20}
                step={1}
                value={rowHeightLines ?? 2}
                onChange={(e) => {
                  const lineCount = Number(e.currentTarget.value);
                  onChangeRowHeightLines(lineCount);
                }}
                data-test-subj="lens-table-row-height-lineCountNumber"
              />
            </>
          ) : null}
        </>
      </EuiFormRow>
    </>
  );
}
