/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import type {
  BaseFieldsLatest,
  ThrottledFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../../common/detection_engine/schemas/alerts';
import type { ConfigType } from '../../../../../config';
import type { CompleteRule, RuleParams } from '../../../rule_schema';
import type { SignalSource } from '../../../signals/types';
import { buildBulkBody } from './build_bulk_body';
import {
  ALERT_THROTTLE_FIELDS,
  ALERT_THROTTLE_VALUES,
  ALERT_THROTTLE_COUNT,
  ALERT_THROTTLE_END,
  ALERT_THROTTLE_START,
} from '../../../../../../common/field_maps/field_names';
import type { BuildReasonMessage } from '../../../signals/reason_formatters';

export interface ThrottleBuckets {
  event: estypes.SearchHit<SignalSource>;
  count: number;
  start: Date;
  end: Date;
  values: Array<string | number | null>;
}

export const wrapThrottledAlerts = ({
  throttleBuckets,
  spaceId,
  completeRule,
  mergeStrategy,
  indicesToQuery,
  buildReasonMessage,
  groupByFields,
  alertTimestampOverride,
}: {
  throttleBuckets: ThrottleBuckets[];
  spaceId: string | null | undefined;
  completeRule: CompleteRule<RuleParams>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  indicesToQuery: string[];
  buildReasonMessage: BuildReasonMessage;
  groupByFields: string[];
  alertTimestampOverride: Date | undefined;
}): Array<WrappedFieldsLatest<ThrottledFieldsLatest>> => {
  return throttleBuckets.map((bucket) => {
    const id = objectHash([
      bucket.event._index,
      bucket.event._id,
      String(bucket.event._version),
      `${spaceId}:${completeRule.alertId}`,
      bucket.values,
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
      alertTimestampOverride
    );
    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        [ALERT_THROTTLE_FIELDS]: groupByFields,
        [ALERT_THROTTLE_VALUES]: bucket.values,
        [ALERT_THROTTLE_START]: bucket.start,
        [ALERT_THROTTLE_END]: bucket.end,
        [ALERT_THROTTLE_COUNT]: bucket.count,
        [ALERT_UUID]: id,
      },
    };
  });
};
