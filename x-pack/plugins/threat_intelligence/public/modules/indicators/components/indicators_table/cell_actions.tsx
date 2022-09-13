/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiDataGridColumnCellActionProps } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { FilterInOut } from '../../../query_bar/components/filter_in_out';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { Indicator } from '../../../../../common/types/indicator';
import { Pagination } from '../../hooks/use_indicators';
import { AddToTimeline } from '../../../timeline/components/add_to_timeline';
import { getIndicatorFieldAndValue } from '../../lib/field_value';

export const CELL_TIMELINE_BUTTON_TEST_ID = 'tiIndicatorsTableCellTimelineButton';

export interface CellActionsProps
  extends Omit<EuiDataGridColumnCellActionProps, 'colIndex' | 'isExpanded'> {
  /**
   * Array of {@link Indicator} to retrieve field and values for the cell actions.
   */
  indicators: Indicator[];
  /**
   *  Received from the IndicatorsTable to extract the correct {@link Indicator} from the array of indicators.
   */
  pagination: Pagination;
}

/**
 * Component used on an EuiDataGrid component (in our case for our IndicatorsTable component),
 * added to the cellActions property of an EuiDataGridColumn.
 * It displays the FilterIn, FilterOut and AddToTimeline icons in the popover
 * when the user hovers above a cell.
 */
export const CellActions: VFC<CellActionsProps> = ({
  rowIndex,
  columnId,
  Component,
  indicators,
  pagination,
}) => {
  const indicator = indicators[rowIndex % pagination.pageSize];
  const { key, value } = getIndicatorFieldAndValue(indicator, columnId);

  if (!value || value === EMPTY_VALUE || !key) {
    return <></>;
  }

  return (
    <>
      <FilterInOut as={Component} data={indicator} field={key} />
      <AddToTimeline
        data={indicator}
        field={key}
        as={Component}
        testId={CELL_TIMELINE_BUTTON_TEST_ID}
      />
    </>
  );
};
