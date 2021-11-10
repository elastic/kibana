/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isNumber } from 'lodash';
import { MetricsAPIRequest } from '../../../../common/http_api';
import { ESSearchClient } from '../types';
import { calculateMetricInterval } from '../../../utils/calculate_metric_interval';

export const calculatedInterval = async (search: ESSearchClient, options: MetricsAPIRequest) => {
  const useModuleInterval =
    options.timerange.interval === 'modules' &&
    isArray(options.modules) &&
    options.modules.length > 0;

  const calcualatedInterval = useModuleInterval
    ? await calculateMetricInterval(
        search,
        {
          indexPattern: options.indexPattern,
          timerange: { from: options.timerange.from, to: options.timerange.to },
        },
        options.modules
      )
    : false;

  const defaultInterval =
    options.timerange.interval === 'modules' ? 'auto' : options.timerange.interval;

  return isNumber(calcualatedInterval) ? `>=${calcualatedInterval}s` : defaultInterval;
};
