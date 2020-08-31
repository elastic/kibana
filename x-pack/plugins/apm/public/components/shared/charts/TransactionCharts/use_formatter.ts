/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, Dispatch, SetStateAction } from 'react';
import { isEmpty } from 'lodash';
import {
  getDurationFormatter,
  TimeFormatter,
} from '../../../../utils/formatters';
import { TimeSeries } from '../../../../../typings/timeseries';
import { getMaxY } from './helper';

export const useFormatter = (
  series: TimeSeries[]
): {
  formatter: TimeFormatter;
  setDisabledSeriesState: Dispatch<SetStateAction<boolean[]>>;
} => {
  const [disabledSeriesState, setDisabledSeriesState] = useState<boolean[]>([]);
  const visibleSeries = series.filter(
    (serie, index) => disabledSeriesState[index] !== true
  );
  const maxY = getMaxY(isEmpty(visibleSeries) ? series : visibleSeries);
  const formatter = getDurationFormatter(maxY);

  return { formatter, setDisabledSeriesState };
};
