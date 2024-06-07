/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { Moment } from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';

import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { ConfigType } from '../../../../config';
import type { CompleteRule, EsqlRuleParams } from '../../rule_schema';
import { buildReasonMessageForNewTermsAlert } from '../utils/reason_formatters';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';
import type { SignalSource } from '../types';
import { getSuppressionAlertFields, getSuppressionTerms } from '../utils';
import { generateAlertId } from './utils';

export const wrapSuppressedEsqlAlerts = ({
  events,
  spaceId,
  completeRule,
  mergeStrategy,
  alertTimestampOverride,
  ruleExecutionLogger,
  publicBaseUrl,
  tuple,
  isRuleAggregating,
  primaryTimestamp,
  secondaryTimestamp,
}: {
  isRuleAggregating: boolean;
  events: Array<estypes.SearchHit<SignalSource>>;
  spaceId: string | null | undefined;
  completeRule: CompleteRule<EsqlRuleParams>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  publicBaseUrl: string | undefined;
  tuple: {
    to: Moment;
    from: Moment;
    maxSignals: number;
  };
  primaryTimestamp: string;
  secondaryTimestamp?: string;
}): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>> => {
  const wrapped = events.map<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>>(
    (event, i) => {
      const combinedFields = { ...event?.fields, ...event._source };

      const suppressionTerms = getSuppressionTerms({
        alertSuppression: completeRule?.ruleParams?.alertSuppression,
        fields: combinedFields,
      });

      const id = generateAlertId({
        event,
        spaceId,
        completeRule,
        tuple,
        isRuleAggregating,
        index: i,
      });

      const instanceId = objectHash([suppressionTerms, completeRule.alertId, spaceId]);

      const baseAlert: BaseFieldsLatest = buildBulkBody(
        spaceId,
        completeRule,
        event,
        mergeStrategy,
        [],
        true,
        buildReasonMessageForNewTermsAlert,
        [],
        alertTimestampOverride,
        ruleExecutionLogger,
        id,
        publicBaseUrl
      );

      return {
        _id: id,
        _index: event._index ?? '',
        _source: {
          ...baseAlert,
          ...getSuppressionAlertFields({
            primaryTimestamp,
            secondaryTimestamp,
            fields: combinedFields,
            suppressionTerms,
            fallbackTimestamp: baseAlert[TIMESTAMP],
            instanceId,
          }),
        },
      };
    }
  );

  return wrapped;
};
