/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export function validateHistogramInterval(histogram, histogramInterval) {
  // If there are no selected histogram fields then we don't need to validate the interval.
  if (!histogram.length) {
    return undefined;
  }

  if (histogramInterval <= 0) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.histogramIntervalZero"
        defaultMessage="Interval must be greater than zero."
      />,
    ];
  }

  if (Math.round(histogramInterval) !== Number(histogramInterval)) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.histogramIntervalWholeNumber"
        defaultMessage="Interval must be a whole number."
      />,
    ];
  }

  if (!histogramInterval) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.histogramIntervalMissing"
        defaultMessage="An interval is required to roll up these histogram fields."
      />,
    ];
  }

  return undefined;
}
