/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ALERT_EVALUATION_THRESHOLD, ALERT_EVALUATION_VALUE, ALERT_ID } from '@kbn/rule-data-utils';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import { ObservabilityRuleTypeFormatter } from '../../../../observability/public';
import {
  ComparatorToi18nMap,
  logThresholdRuleDataNamespace,
  logThresholdRuleDataRT,
} from '../../../common/alerting/logs/log_threshold';

export const formatReason: ObservabilityRuleTypeFormatter = ({ fields }) => {
  const reason = pipe(
    logThresholdRuleDataRT.decode(fields),
    fold(
      () => unknownReasonDescription,
      (logThresholdRuleData) => {
        const params = logThresholdRuleData[logThresholdRuleDataNamespace][0].params;

        // TODO: differentiate count and ratio alerts
        if ((params.groupBy?.length ?? 0) > 0) {
          return i18n.translate(
            'xpack.infra.logs.alerting.threshold.ungroupedAlertReasonDescription',
            {
              defaultMessage:
                '{groupName}: {actualCount} {actualCount, plural, one {log entry} other {log entries} } ({comparator} {thresholdCount}) match the configured conditions.',
              values: {
                actualCount: fields[ALERT_EVALUATION_VALUE],
                comparator: ComparatorToi18nMap[params.count.comparator],
                groupName: fields[ALERT_ID],
                thresholdCount: fields[ALERT_EVALUATION_THRESHOLD],
              },
            }
          );
        } else {
          return i18n.translate(
            'xpack.infra.logs.alerting.threshold.ungroupedAlertReasonDescription',
            {
              defaultMessage:
                '{actualCount} {actualCount, plural, one {log entry} other {log entries} } ({comparator} {thresholdCount}) match the configured conditions.',
              values: {
                actualCount: fields[ALERT_EVALUATION_VALUE],
                comparator: ComparatorToi18nMap[params.count.comparator],
                thresholdCount: fields[ALERT_EVALUATION_THRESHOLD],
              },
            }
          );
        }
      }
    )
  );

  return {
    reason,
    // TODO: pass time as unix timestamps
    link: `/app/logs/link-to/default/logs?time=${fields['kibana.rac.alert.start']}`,
  };
};

const unknownReasonDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.unknownReasonDescription',
  {
    defaultMessage: 'unknown reason',
  }
);
