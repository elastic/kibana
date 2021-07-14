/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_ID,
  ALERT_START,
} from '@kbn/rule-data-utils';
import { modifyUrl } from '@kbn/std';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import { ObservabilityRuleTypeFormatter } from '../../../../observability/public';
import {
  ComparatorToi18nMap,
  logThresholdRuleDataRT,
  logThresholdRuleDataSerializedParamsKey,
  ratioAlertParamsRT,
} from '../../../common/alerting/logs/log_threshold';

export const formatReason: ObservabilityRuleTypeFormatter = ({ fields }) => {
  const reason = pipe(
    logThresholdRuleDataRT.decode(fields),
    fold(
      () =>
        i18n.translate('xpack.infra.logs.alerting.threshold.unknownReasonDescription', {
          defaultMessage: 'unknown reason',
        }),
      (logThresholdRuleData) => {
        const params = logThresholdRuleData[logThresholdRuleDataSerializedParamsKey][0];

        const actualCount = fields[ALERT_EVALUATION_VALUE];
        const groupName = fields[ALERT_ID];
        const isGrouped = (params.groupBy?.length ?? 0) > 0;
        const thresholdCount = fields[ALERT_EVALUATION_THRESHOLD];
        const translatedComparator = ComparatorToi18nMap[params.count.comparator];

        return i18n.translate('xpack.infra.logs.alerting.threshold.ratioAlertReasonDescription', {
          defaultMessage:
            '{isGrouped, select, true{{groupName}: } false{}}The log entries ratio is {actualCount} ({translatedComparator} {thresholdCount}).',
          values: {
            actualCount,
            translatedComparator,
            groupName,
            isGrouped,
            thresholdCount,
          },
        });
      }
    )
  );

  const alertStartDate = fields[ALERT_START];
  const timestamp = alertStartDate != null ? new Date(alertStartDate).valueOf() : null;
  const link = modifyUrl('/app/logs/link-to/default/logs', ({ query, ...otherUrlParts }) => ({
    ...otherUrlParts,
    query: {
      ...query,
      ...(timestamp != null ? { time: `${timestamp}` } : {}),
    },
  }));

  return {
    reason,
    link, // TODO: refactor to URL generators
  };
};
