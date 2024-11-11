/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFormRow, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { RowHeightSettings } from '@kbn/unified-data-table';
import { ToolbarPopover } from '../../../shared_components';
import type { VisualizationToolbarProps } from '../../../types';
import type { DatatableVisualizationState } from '../visualization';
import { RowHeightMode } from '../../../../common/types';
import { DEFAULT_PAGE_SIZE } from './table_basic';
import {
  DEFAULT_HEADER_ROW_HEIGHT,
  DEFAULT_HEADER_ROW_HEIGHT_LINES,
  DEFAULT_ROW_HEIGHT_LINES,
} from './constants';

export function DataTableToolbar(props: VisualizationToolbarProps<DatatableVisualizationState>) {
  const { state, setState } = props;
  const onChangeHeight = useCallback(
    (
      newHeightMode: RowHeightMode | undefined,
      heightProperty: string,
      heightLinesProperty: string,
      defaultRowHeight = DEFAULT_ROW_HEIGHT_LINES
    ) => {
      const rowHeightLines =
        newHeightMode === RowHeightMode.single
          ? 1
          : newHeightMode !== RowHeightMode.auto
          ? defaultRowHeight
          : undefined;
      setState({
        ...state,
        [heightProperty]: newHeightMode,
        [heightLinesProperty]: rowHeightLines,
      });
    },
    [setState, state]
  );

  const onChangeHeightLines = useCallback(
    (newRowHeightLines: number, heightLinesProperty: string) => {
      setState({
        ...state,
        [heightLinesProperty]: newRowHeightLines,
      });
    },
    [setState, state]
  );

  const onTogglePagination = useCallback(() => {
    const current = state.paging ?? { size: DEFAULT_PAGE_SIZE, enabled: false };

    setState({
      ...state,
      paging: { ...current, enabled: !current.enabled },
    });
  }, [setState, state]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
      <ToolbarPopover
        title={i18n.translate('xpack.lens.table.valuesVisualOptions', {
          defaultMessage: 'Visual options',
        })}
        type="visualOptions"
        groupPosition="none"
        buttonDataTestSubj="lnsVisualOptionsButton"
        data-test-subj="lnsVisualOptionsPopover"
      >
        <RowHeightSettings
          rowHeight={state.headerRowHeight ?? DEFAULT_HEADER_ROW_HEIGHT}
          rowHeightLines={state.headerRowHeightLines ?? DEFAULT_HEADER_ROW_HEIGHT_LINES}
          label={i18n.translate('xpack.lens.table.visualOptionsHeaderRowHeightLabel', {
            defaultMessage: 'Header row height',
          })}
          onChangeRowHeight={(mode) =>
            onChangeHeight(
              mode,
              'headerRowHeight',
              'headerRowHeightLines',
              DEFAULT_HEADER_ROW_HEIGHT_LINES
            )
          }
          onChangeRowHeightLines={(lines) => {
            onChangeHeightLines(lines, 'headerRowHeightLines');
          }}
          data-test-subj="lnsHeaderHeightSettings"
          maxRowHeight={5}
          compressed
        />
        <RowHeightSettings
          rowHeight={state.rowHeight}
          rowHeightLines={state.rowHeightLines}
          label={i18n.translate('xpack.lens.table.visualOptionsFitRowToContentLabel', {
            defaultMessage: 'Cell row height',
          })}
          onChangeRowHeight={(mode) => onChangeHeight(mode, 'rowHeight', 'rowHeightLines')}
          onChangeRowHeightLines={(lines) => {
            onChangeHeightLines(lines, 'rowHeightLines');
          }}
          data-test-subj="lnsRowHeightSettings"
          compressed
        />
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.visualOptionsPaginateTable', {
            defaultMessage: 'Paginate table',
          })}
          display="columnCompressed"
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
