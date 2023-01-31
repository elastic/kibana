/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import {
  ALERT_UUID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_START,
} from '@kbn/rule-data-utils';
import type {
  BaseFieldsLatest,
  SuppressionFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../../common/detection_engine/schemas/alerts';
import type { ConfigType } from '../../../../../config';
import type { CompleteRule, RuleParams } from '../../../rule_schema';
import type { IRuleExecutionLogForExecutors } from '../../../rule_monitoring';
import type { SignalSource } from '../../../signals/types';
import { buildBulkBody } from './build_bulk_body';
import type { BuildReasonMessage } from '../../../signals/reason_formatters';

export interface SuppressionBuckets {
  event: estypes.SearchHit<SignalSource>;
  count: number;
  start: Date;
  end: Date;
  terms: Array<{ field: string; value: string | number | null }>;
}

export const wrapSuppressedAlerts = ({
  suppressionBuckets,
  spaceId,
  completeRule,
  mergeStrategy,
  indicesToQuery,
  buildReasonMessage,
  alertTimestampOverride,
  ruleExecutionLogger,
}: {
  suppressionBuckets: SuppressionBuckets[];
  spaceId: string | null | undefined;
  completeRule: CompleteRule<RuleParams>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  indicesToQuery: string[];
  buildReasonMessage: BuildReasonMessage;
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
}): Array<WrappedFieldsLatest<SuppressionFieldsLatest>> => {
  return suppressionBuckets.map((bucket) => {
    const id = objectHash([
      bucket.event._index,
      bucket.event._id,
      String(bucket.event._version),
      `${spaceId}:${completeRule.alertId}`,
      bucket.terms,
      bucket.start,
      bucket.end,
    ]);
    const baseAlert: BaseFieldsLatest = buildBulkBody(
      spaceId,
      completeRule,
      bucket.event,
      mergeStrategy,
      [],
      true,
      buildReasonMessage,
      indicesToQuery,
      alertTimestampOverride,
      ruleExecutionLogger
    );
    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        [ALERT_SUPPRESSION_TERMS]: bucket.terms,
        [ALERT_SUPPRESSION_START]: bucket.start,
        [ALERT_SUPPRESSION_END]: bucket.end,
        [ALERT_SUPPRESSION_DOCS_COUNT]: bucket.count - 1,
        [ALERT_UUID]: id,
      },
    };
  });
};
