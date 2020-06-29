/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { dateRangeSelector } from '../state/selectors';
import { setDateRange } from '../state/actions';
import { parseAbsoluteDate } from '../lib/helper/url_params/parse_absolute_date';

export const useAbsoluteDateRange = () => {
  const dateRange = useSelector(dateRangeSelector);
  const from = parseAbsoluteDate(dateRange.from, 0);
  const to = parseAbsoluteDate(dateRange.to, 0);
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
