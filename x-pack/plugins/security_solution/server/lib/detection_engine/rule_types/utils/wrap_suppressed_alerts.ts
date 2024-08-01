/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';

import { TIMESTAMP } from '@kbn/rule-data-utils';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { SignalSourceHit } from '../types';

import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { ConfigType } from '../../../../config';
import type {
  CompleteRule,
  EqlRuleParams,
  MachineLearningRuleParams,
  ThreatRuleParams,
} from '../../rule_schema';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';
import { getSuppressionAlertFields, getSuppressionTerms } from './suppression_utils';
import { generateId } from './utils';

import type { BuildReasonMessage } from './reason_formatters';

type RuleWithInMemorySuppression = ThreatRuleParams | EqlRuleParams | MachineLearningRuleParams;

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
  skipGenerateId = false,
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
  skipGenerateId: boolean;
  secondaryTimestamp?: string;
}): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>> => {
  return events.map((event) => {
    const suppressionTerms = getSuppressionTerms({
      alertSuppression: completeRule?.ruleParams?.alertSuppression,
      fields: event.fields,
      event,
    });
    let id = event._id;
    let baseAlert: BaseFieldsLatest = event;
    if (!skipGenerateId) {
      id = generateId(
        event._index,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        event._id!,
        String(event._version),
        `${spaceId}:${completeRule.alertId}`
      );
      baseAlert = buildBulkBody(
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
    }

    const instanceId = objectHash([suppressionTerms, completeRule.alertId, spaceId]);
    console.error('INSTANCE ID', instanceId);
    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        ...getSuppressionAlertFields({
          primaryTimestamp,
          secondaryTimestamp,
          fields: event.fields,
          event,
          suppressionTerms,
          fallbackTimestamp: baseAlert[TIMESTAMP],
          instanceId,
        }),
      },
    };
  });
};
