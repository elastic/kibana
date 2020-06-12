/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { dateRangeSelector } from '../state/selectors';
import { useAbsoluteDate } from './use_absolute_date';
import { setDateRange } from '../state/actions';

export const useAbsoluteDateRange = () => {
  const dateRange = useSelector(dateRangeSelector);
  const from = useAbsoluteDate(dateRange.from);
  const to = useAbsoluteDate(dateRange.to);
  const dispatch = useDispatch();
  const updateDateRange = useCallback(
    (absFrom: number, absTo: number) => {
      dispatch(
        setDateRange({ from: moment(absFrom).toISOString(), to: moment(absTo).toISOString() })
      );
    },
    [dispatch]
  );

  return {
    from,
    to,
    updateDateRange,
  };
};
