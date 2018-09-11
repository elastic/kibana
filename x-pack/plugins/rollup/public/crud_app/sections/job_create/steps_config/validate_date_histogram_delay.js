/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  ParseEsIntervalInvalidFormatError,
  ParseEsIntervalInvalidCalendarIntervalError,
  parseEsInterval,
} from 'ui/utils/parse_es_interval';

export function validateDateHistogramDelay(dateHistogramDelay) {
  // This field is optional, so if nothing has been provided we can skip validation.
  if (!dateHistogramDelay || !dateHistogramDelay.trim()) {
    return undefined;
  }

  try {
    parseEsInterval(dateHistogramDelay);
  } catch(error) {
    if (error instanceof ParseEsIntervalInvalidFormatError) {
      return [(
        <FormattedMessage
          id="xpack.rollupJobs.create.errors.dateHistogramDelayInvalidFormat"
          defaultMessage="Invalid interval format"
        />
      )];
    }

    if (error instanceof ParseEsIntervalInvalidCalendarIntervalError) {
      return [(
        <FormattedMessage
          id="xpack.rollupJobs.create.errors.dateHistogramDelayInvalidCalendarInterval"
          defaultMessage="This type of calendar interval must have a time-span of 1"
        />
      )];
    }

    throw(error);
  }

  return undefined;
}
