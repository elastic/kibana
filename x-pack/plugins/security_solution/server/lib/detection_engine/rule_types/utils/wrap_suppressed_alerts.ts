/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import sortBy from 'lodash/sortBy';
import pick from 'lodash/pick';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import type { SignalSource, SimpleHit, SignalSourceHit } from '../types';

import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { ConfigType } from '../../../../config';
import type { CompleteRule, RuleParams, ThreatRuleParams } from '../../rule_schema';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';

import type { ThresholdBucket } from './types';
import type { BuildReasonMessage } from './reason_formatters';
import { transformBucketIntoHit } from './bulk_create_threshold_signals';
import type { ThresholdNormalized } from '../../../../../common/api/detection_engine/model/rule_schema';

/**
 * wraps suppressed threshold alerts
 * first, transforms aggregation threshold buckets to hits
 * creates instanceId hash, which is used to search suppressed on time interval alerts
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
}: {
  //  events: Array<estypes.SearchHit<SignalSource>>;
  events: SignalSourceHit[];
  spaceId: string;
  completeRule: CompleteRule<ThreatRuleParams>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  indicesToQuery: string[];
  buildReasonMessage: BuildReasonMessage;
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  publicBaseUrl: string | undefined;
}): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>> => {
  const suppressedBy = completeRule?.ruleParams?.alertSuppression?.groupBy ?? [];

  const suppressedMap: Record<string, number> = {};

  const filteredAlerts = events.reduce<
    Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>>
  >((acc, event) => {
    const suppressedProps = pick(event.fields, suppressedBy) as Record<
      string,
      string[] | number[] | undefined
    >;
    // if (Object.keys(suppressedProps) < suppressedBy.length) {
    //     suppressedBy.forEach(suppressKey => {
    //         if (suppressedProps[suppressKey] === undefined) {

    //         }
    //     })
    // }

    const id = objectHash([
      event._index,
      event._id,
      `${spaceId}:${completeRule.alertId}`,
      suppressedProps,
    ]);

    // console.log('>> event', event);
    // console.log('>> suppressedBy', suppressedBy);
    // console.log('>> suppressedProps', suppressedProps);
    // console.log(
    //   '>> Object.entries(suppressedProps).map(([field, value]) => ',
    //   Object.entries(suppressedProps).map(([field, value]) => ({
    //     field,
    //     value,
    //   }))
    // );
    const instanceId = objectHash([suppressedProps, completeRule.alertId, spaceId]);

    // if (suppressedMap[instanceId] != null) {
    //   suppressedMap[instanceId] += 1;
    //   return acc;
    // }
    // suppressedMap[instanceId] = 0;

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
    // suppression start/end equals to alert timestamp, since we suppress alerts for rule type, not documents as for query rule type
    const suppressionTime = new Date(baseAlert[TIMESTAMP]);
    acc.push({
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        [ALERT_SUPPRESSION_TERMS]: suppressedBy.map((field) => ({
          field,
          value: (suppressedProps[field] && suppressedProps[field]?.join()) ?? null,
        })),
        [ALERT_SUPPRESSION_START]: suppressionTime,
        [ALERT_SUPPRESSION_END]: suppressionTime,
        [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        [ALERT_INSTANCE_ID]: instanceId,
      },
    });

    return acc;
  }, []);

  return filteredAlerts;
  //   console.log('suppressedMAP', suppressedMap);
  //   return filteredAlerts.map((alert) => {
  //     const instanceId = alert._source[ALERT_INSTANCE_ID];
  //     alert._source[ALERT_SUPPRESSION_DOCS_COUNT] = suppressedMap[instanceId];
  //     return alert;
  //   });
};

// const convertSuppressionValue = (value: string[] | number[] | undefined) => {
//   if (!value) {
//     return null;
//   } else if (value?.length === 1) {
//     return value[0];
//   } else {
//     return value?.join();
//   }
// };
