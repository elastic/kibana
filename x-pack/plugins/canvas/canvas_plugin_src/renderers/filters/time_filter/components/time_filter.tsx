/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePicker, OnTimeChangeProps, EuiSuperDatePickerCommonRange } from '@elastic/eui';
import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { fromExpression } from '@kbn/interpreter';
import { UnitStrings } from '../../../../../i18n/units';

const { quickRanges: strings } = UnitStrings;

const defaultQuickRanges: EuiSuperDatePickerCommonRange[] = [
  { start: 'now-1d/d', end: 'now-1d/d', label: strings.getYesterdayLabel() },
  { start: 'now/d', end: 'now', label: strings.getTodayLabel() },
  { start: 'now-24h', end: 'now', label: strings.getLast24HoursLabel() },
  { start: 'now-7d', end: 'now', label: strings.getLast7DaysLabel() },
  { start: 'now-14d', end: 'now', label: strings.getLast2WeeksLabel() },
  { start: 'now-30d', end: 'now', label: strings.getLast30DaysLabel() },
  { start: 'now-90d', end: 'now', label: strings.getLast90DaysLabel() },
  { start: 'now-1y', end: 'now', label: strings.getLast1YearLabel() },
];

export interface FilterMeta {
  /** Name of datetime column to be filtered  */
  column: string;
  /** Start date string of filtered date range */
  start: string;
  /** End date string of filtered date range */
  end: string;
}

function getFilterMeta(filter: string): FilterMeta {
  const ast = fromExpression(filter);
  const column = get(ast, 'chain[0].arguments.column[0]') as string;
  const start = get(ast, 'chain[0].arguments.from[0]') as string;
  const end = get(ast, 'chain[0].arguments.to[0]') as string;
  return { column, start, end };
}

export interface Props {
  /** Initial value of the filter */
  filter: string;
  /** Function invoked when the filter changes */
  commit: (filter: string) => void;
  /** Elastic datemath format string */
  dateFormat?: string;
  /** Array of time ranges */
  commonlyUsedRanges?: EuiSuperDatePickerCommonRange[];
}

export const TimeFilter = ({ filter, commit, dateFormat, commonlyUsedRanges = [] }: Props) => {
  const setFilter =
    (column: string) =>
    ({ start, end }: OnTimeChangeProps) => {
      commit(`timefilter from="${start}" to=${end} column=${column}`);
    };

  const { column, start, end } = getFilterMeta(filter);

  return (
    <div className="canvasTimeFilter">
      <EuiSuperDatePicker
        start={start}
        end={end}
        isPaused={false}
        onTimeChange={setFilter(column)}
        showUpdateButton={false}
        dateFormat={dateFormat}
        commonlyUsedRanges={commonlyUsedRanges.length ? commonlyUsedRanges : defaultQuickRanges}
      />
    </div>
  );
};

TimeFilter.propTypes = {
  filter: PropTypes.string.isRequired,
  commit: PropTypes.func.isRequired, // Canvas filter
  dateFormat: PropTypes.string,
  commonlyUsedRanges: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.string.isRequired,
      end: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
};
