/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { MetricsExplorerTimeOptions } from '../../../containers/metrics_explorer/use_metrics_explorer_options';

export const updateTimerangeToNow = (
  currentTimerange: MetricsExplorerTimeOptions,
  setTimeRange: (timerange: MetricsExplorerTimeOptions) => void
) => {
  const diff = currentTimerange.to - currentTimerange.from;
  setTimeRange({
    ...currentTimerange,
    from: moment()
      .subtract(diff, 'milliseconds')
      .valueOf(),
    to: moment().valueOf(),
  });
};
