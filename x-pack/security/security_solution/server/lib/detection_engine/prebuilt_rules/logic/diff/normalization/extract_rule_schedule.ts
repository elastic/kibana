/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import dateMath from '@elastic/datemath';
import { parseDuration } from '@kbn/alerting-plugin/common';

import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleSchedule } from '../../../../../../../common/api/detection_engine/prebuilt_rules';
import type { PrebuiltRuleAsset } from '../../../model/rule_assets/prebuilt_rule_asset';

export const extractRuleSchedule = (rule: RuleResponse | PrebuiltRuleAsset): RuleSchedule => {
  const interval = rule.interval ?? '5m';
  const from = rule.from ?? 'now-6m';
  const to = rule.to ?? 'now';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ruleMeta = (rule.meta ?? {}) as any;
  const lookbackFromMeta = String(ruleMeta.from ?? '');

  const intervalDuration = parseInterval(interval);
  const lookbackFromMetaDuration = parseInterval(lookbackFromMeta);
  const driftToleranceDuration = parseDriftTolerance(from, to);

  if (lookbackFromMetaDuration != null) {
    if (intervalDuration != null) {
      return {
        interval,
        lookback: lookbackFromMeta,
      };
    }
    return {
      interval: `Cannot parse: interval="${interval}"`,
      lookback: lookbackFromMeta,
    };
  }

  if (intervalDuration == null) {
    return {
      interval: `Cannot parse: interval="${interval}"`,
      lookback: `Cannot calculate due to invalid interval`,
    };
  }

  if (driftToleranceDuration == null) {
    return {
      interval,
      lookback: `Cannot parse: from="${from}", to="${to}"`,
    };
  }

  const lookbackDuration = moment.duration().add(driftToleranceDuration).subtract(intervalDuration);
  const lookback = `${lookbackDuration.asSeconds()}s`;

  return { interval, lookback };
};

const parseInterval = (intervalString: string): moment.Duration | null => {
  try {
    const milliseconds = parseDuration(intervalString);
    return moment.duration(milliseconds);
  } catch (e) {
    return null;
  }
};

const parseDriftTolerance = (from: string, to: string): moment.Duration | null => {
  const now = new Date();
  const fromDate = parseDateMathString(from, now);
  const toDate = parseDateMathString(to, now);

  if (fromDate == null || toDate == null) {
    return null;
  }

  return moment.duration(toDate.diff(fromDate));
};

const parseDateMathString = (dateMathString: string, now: Date): moment.Moment | null => {
  const parsedDate = dateMath.parse(dateMathString, { forceNow: now });
  return parsedDate != null && parsedDate.isValid() ? parsedDate : null;
};
