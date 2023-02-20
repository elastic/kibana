/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AlertSummaryTimeRange } from '@kbn/triggers-actions-ui-plugin/public';
import { defaultTimeRage } from './constants';

export const getDefaultAlertSummaryTimeRange = (): AlertSummaryTimeRange => {
  const { to, from } = getAbsoluteTimeRange(defaultTimeRage);

  return {
    utcFrom: from,
    utcTo: to,
    fixedInterval: '1d',
    title: (
      <FormattedMessage
        id="xpack.observability.alertsSummaryWidget.last30days"
        defaultMessage="Last 30 days"
      />
    ),
  };
};

export const getAlertSummaryTimeRange = (
  timeRange: TimeRange,
  fixedInterval: string,
  dateFormat: string
): AlertSummaryTimeRange => {
  const { to, from } = getAbsoluteTimeRange(timeRange);

  return {
    utcFrom: from,
    utcTo: to,
    fixedInterval,
    dateFormat,
  };
};
