/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type { TimeframePreviewOptions } from '../../../pages/detection_engine/rules/types';
import { getTimeTypeValue } from '../../../../detection_engine/rule_creation_ui/pages/rule_creation/helpers';

export const usePreviewInvocationCount = ({
  timeframeOptions,
}: {
  timeframeOptions: TimeframePreviewOptions;
}) => {
  const timeframeDuration =
    (timeframeOptions.timeframeEnd.valueOf() / 1000 -
      timeframeOptions.timeframeStart.valueOf() / 1000) *
    1000;

  const { unit: intervalUnit, value: intervalValue } = getTimeTypeValue(timeframeOptions.interval);
  const duration = moment.duration(intervalValue, intervalUnit);
  const ruleIntervalDuration = duration.asMilliseconds();

  const invocationCount = Math.max(Math.ceil(timeframeDuration / ruleIntervalDuration), 1);
  const interval = timeframeOptions.interval;

  const { unit: lookbackUnit, value: lookbackValue } = getTimeTypeValue(timeframeOptions.lookback);
  duration.add(lookbackValue, lookbackUnit);

  const from = `now-${duration.asSeconds()}s`;

  return { invocationCount, interval, from };
};
