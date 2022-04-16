/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { search } from '@kbn/data-plugin/public';
const { InvalidEsIntervalFormatError, InvalidEsCalendarIntervalError, parseEsInterval } =
  search.aggs;

export function validateDateHistogramInterval(dateHistogramInterval) {
  if (!dateHistogramInterval || !dateHistogramInterval.trim()) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.dateHistogramIntervalMissing"
        defaultMessage="Interval is required."
      />,
    ];
  }

  try {
    parseEsInterval(dateHistogramInterval);
  } catch (error) {
    if (error instanceof InvalidEsIntervalFormatError) {
      return [
        <FormattedMessage
          id="xpack.rollupJobs.create.errors.dateHistogramIntervalInvalidFormat"
          defaultMessage="Invalid interval format."
        />,
      ];
    }

    if (error instanceof InvalidEsCalendarIntervalError) {
      const { unit } = error;
      return [
        <FormattedMessage
          id="xpack.rollupJobs.create.errors.dateHistogramIntervalInvalidCalendarInterval"
          defaultMessage="The '{unit}' unit only allows values of 1. Try {suggestion}."
          values={{
            unit,
            suggestion: (
              <strong>
                <FormattedMessage
                  id="xpack.rollupJobs.create.errors.dateHistogramIntervalInvalidCalendarIntervalSuggestion"
                  defaultMessage="1{unit}"
                  values={{ unit }}
                />
              </strong>
            ),
          }}
        />,
      ];
    }

    throw error;
  }

  return undefined;
}
