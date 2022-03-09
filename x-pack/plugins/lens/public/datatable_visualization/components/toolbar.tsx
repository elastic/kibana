/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFormRow,
  EuiRange,
  EuiSwitch,
  EuiToolTip,
  htmlIdGenerator,
} from '@elastic/eui';
import { ToolbarPopover } from '../../shared_components';
import type { VisualizationToolbarProps } from '../../types';
import type { DatatableVisualizationState } from '../visualization';
import { DEFAULT_PAGE_SIZE } from './table_basic';

const idPrefix = htmlIdGenerator()();

export function DataTableToolbar(props: VisualizationToolbarProps<DatatableVisualizationState>) {
  const { state, setState } = props;

  const onChangeRowHeight = useCallback(
    (newHeightMode) => {
      const rowHeightLines =
        newHeightMode === 'single' ? 1 : newHeightMode !== 'auto' ? 2 : undefined;
      setState({
        ...state,
        rowHeight: newHeightMode,
        rowHeightLines,
      });
    },
    [setState, state]
  );

  const onChangeRowHeightLines = useCallback(
    (newRowHeightLines) => {
      setState({
        ...state,
        rowHeightLines: newRowHeightLines,
      });
    },
    [state, setState]
  );

  const onTogglePagination = useCallback(() => {
    const current = state.paging ?? { size: DEFAULT_PAGE_SIZE, enabled: false };

    setState({
      ...state,
      paging: { ...current, enabled: !current.enabled },
    });
  }, [setState, state]);

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
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" responsive={false}>
      <ToolbarPopover
        title={i18n.translate('xpack.lens.table.valuesVisualOptions', {
          defaultMessage: 'Visual options',
        })}
        type="visualOptions"
        groupPosition="none"
        buttonDataTestSubj="lnsVisualOptionsButton"
      >
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.visualOptionsFitRowToContentLabel', {
            defaultMessage: 'Row height',
          })}
          display="columnCompressed"
        >
          <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.table.visualOptionsRowHeight', {
              defaultMessage: 'Row height',
            })}
            data-test-subj="lens-table-row-height"
            name="legendLocation"
            buttonSize="compressed"
            options={rowHeightModeOptions}
            idSelected={`${idPrefix}${state.rowHeight ?? 'single'}`}
            onChange={(optionId) => {
              const newMode = optionId.replace(
                idPrefix,
                ''
              ) as DatatableVisualizationState['rowHeight'];
              onChangeRowHeight(newMode);
            }}
          />
        </EuiFormRow>
        {state.rowHeight === 'custom' ? (
          <EuiFormRow
            label={i18n.translate('xpack.lens.table.visualOptionsCustomRowHeight', {
              defaultMessage: 'Lines per row',
            })}
            display="columnCompressed"
          >
            <EuiRange
              compressed
              fullWidth
              showInput
              min={1}
              max={20}
              step={1}
              value={state.rowHeightLines ?? 2}
              onChange={(e) => {
                const lineCount = Number(e.currentTarget.value);
                onChangeRowHeightLines(lineCount);
              }}
              data-test-subj="lens-table-row-height-lineCountNumber"
            />
          </EuiFormRow>
        ) : null}
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.visualOptionsPaginateTable', {
            defaultMessage: 'Paginate table',
          })}
          display="columnCompressedSwitch"
        >
          <EuiToolTip
            content={i18n.translate('xpack.lens.table.visualOptionsPaginateTableTooltip', {
              defaultMessage: 'Pagination is hidden if there are less than 10 items',
            })}
            position="right"
          >
            <EuiSwitch
              compressed
              data-test-subj="lens-table-pagination-switch"
              label=""
              showLabel={false}
              checked={Boolean(state.paging?.enabled)}
              onChange={onTogglePagination}
            />
          </EuiToolTip>
        </EuiFormRow>
      </ToolbarPopover>
    </EuiFlexGroup>
  );
}
