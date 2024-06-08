/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';

import { TIMESTAMP } from '@kbn/rule-data-utils';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { RuleWithInMemorySuppression, SignalSourceHit } from '../types';

import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { ConfigType } from '../../../../config';
import type { CompleteRule } from '../../rule_schema';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';
import { getSuppressionAlertFields, getSuppressionTerms } from './suppression_utils';
import { generateId } from './utils';

import type { BuildReasonMessage } from './reason_formatters';

/**
 * wraps suppressed alerts
 * creates instanceId hash, which is used to search on time interval alerts
 * populates alert's suppression fields
 */
export const wrapSuppressedAlerts = ({
  events,
  spaceId,
  completeRule,
  mergeStrategy,
  indicesToQuery,
  buildReasonMessage,
  alertTimestampOverride,
  ruleExecutionLogger,
  publicBaseUrl,
  primaryTimestamp,
  secondaryTimestamp,
}: {
  events: SignalSourceHit[];
  spaceId: string;
  completeRule: CompleteRule<RuleWithInMemorySuppression>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  indicesToQuery: string[];
  buildReasonMessage: BuildReasonMessage;
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  publicBaseUrl: string | undefined;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
}): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>> => {
  return events.map((event) => {
    const suppressionTerms = getSuppressionTerms({
      alertSuppression: completeRule?.ruleParams?.alertSuppression,
      fields: event.fields,
    });

    const id = generateId(
      event._index,
      event._id,
      String(event._version),
      `${spaceId}:${completeRule.alertId}`
    );

    const instanceId = objectHash([suppressionTerms, completeRule.alertId, spaceId]);

    const baseAlert: BaseFieldsLatest = buildBulkBody(
      spaceId,
      completeRule,
      event,
      mergeStrategy,
      [],
      true,
      buildReasonMessage,
      indicesToQuery,
      alertTimestampOverride,
      ruleExecutionLogger,
      id,
      publicBaseUrl
    );

    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        ...getSuppressionAlertFields({
          primaryTimestamp,
          secondaryTimestamp,
          fields: event.fields,
          suppressionTerms,
          fallbackTimestamp: baseAlert[TIMESTAMP],
          instanceId,
        }),
      },
    };
  });
};
