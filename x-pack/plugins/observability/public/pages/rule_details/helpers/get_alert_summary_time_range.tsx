/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertSummaryTimeRange } from '@kbn/triggers-actions-ui-plugin/public/application/hooks/use_load_alert_summary';
import React from 'react';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';

export const getAlertSummaryWidgetTimeRange = (): AlertSummaryTimeRange => {
  const { to, from } = getAbsoluteTimeRange({
    from: 'now-30d',
    to: 'now',
  });

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
