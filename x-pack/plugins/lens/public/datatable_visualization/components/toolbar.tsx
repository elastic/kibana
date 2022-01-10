/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFormRow, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { ToolbarPopover } from '../../shared_components';
import type { VisualizationToolbarProps } from '../../types';
import type { DatatableVisualizationState } from '../visualization';
import { DEFAULT_PAGE_SIZE } from './table_basic';

export function DataTableToolbar(props: VisualizationToolbarProps<DatatableVisualizationState>) {
  const { state, setState } = props;

  const onToggleFitRow = useCallback(() => {
    const current = state.fitRowToContent ?? false;
    setState({
      ...state,
      fitRowToContent: !current,
    });
  }, [setState, state]);

  const onTogglePagination = useCallback(() => {
    const current = state.paging ?? { size: DEFAULT_PAGE_SIZE, enabled: false };

    setState({
      ...state,
      paging: { ...current, enabled: !current.enabled },
    });
  }, [setState, state]);

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
            defaultMessage: 'Fit row to content',
          })}
          display="columnCompressedSwitch"
        >
          <EuiSwitch
            compressed
            data-test-subj="lens-legend-auto-height-switch"
            label=""
            showLabel={false}
            checked={Boolean(state.fitRowToContent)}
            onChange={onToggleFitRow}
          />
        </EuiFormRow>
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
