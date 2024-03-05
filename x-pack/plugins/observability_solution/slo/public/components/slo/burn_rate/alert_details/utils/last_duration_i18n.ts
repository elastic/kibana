/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { TimeRange } from '../../../error_rate_chart/use_lens_definition';

export function getLastDurationInUnit(timeRange: TimeRange): string {
  const duration = moment.duration(moment(timeRange.to).diff(timeRange.from));
  const durationInSeconds = duration.asSeconds();

  const oneMinute = 60;
  if (durationInSeconds < oneMinute) {
    return i18n.translate('xpack.slo.burnRateRule.alertDetailsAppSection.lastDurationInSeconds', {
      defaultMessage: 'Last {duration} seconds',
      values: {
        duration: Math.trunc(durationInSeconds),
      },
    });
  }

  const twoHours = 2 * 60 * 60;
  if (durationInSeconds < twoHours) {
    return i18n.translate('xpack.slo.burnRateRule.alertDetailsAppSection.lastDurationInMinutes', {
      defaultMessage: 'Last {duration} minutes',
      values: {
        duration: Math.trunc(duration.asMinutes()),
      },
    });
  }

  const twoDays = 2 * 24 * 60 * 60;
  if (durationInSeconds < twoDays) {
    return i18n.translate('xpack.slo.burnRateRule.alertDetailsAppSection.lastDurationInHours', {
      defaultMessage: 'Last {duration} hours',
      values: {
        duration: Math.trunc(duration.asHours()),
      },
    });
  }

  return i18n.translate('xpack.slo.burnRateRule.alertDetailsAppSection.lastDurationInDays', {
    defaultMessage: 'Last {duration} days',
    values: {
      duration: Math.trunc(duration.asDays()),
    },
  });
}
