/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import pick from 'lodash/pick';
import get from 'lodash/get';
import sortBy from 'lodash/sortBy';

import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import type { SignalSourceHit } from '../types';

import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { ConfigType } from '../../../../config';
import type { CompleteRule, ThreatRuleParams } from '../../rule_schema';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';

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
  completeRule: CompleteRule<ThreatRuleParams>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  indicesToQuery: string[];
  buildReasonMessage: BuildReasonMessage;
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  publicBaseUrl: string | undefined;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
}): Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>> => {
  const suppressedBy = completeRule?.ruleParams?.alertSuppression?.groupBy ?? [];

  return events.map((event) => {
    const suppressedProps = pick(event.fields, suppressedBy) as Record<
      string,
      string[] | number[] | undefined
    >;
    const suppressionTerms = suppressedBy.map((field) => {
      const value = suppressedProps[field] ?? null;
      const sortedValue = Array.isArray(value) ? (sortBy(value) as string[] | number[]) : value;
      return {
        field,
        value: sortedValue,
      };
    });

    const id = objectHash([
      event._index,
      event._id,
      `${spaceId}:${completeRule.alertId}`,
      suppressionTerms,
    ]);

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

    const suppressionTime = new Date(
      get(event.fields, primaryTimestamp) ??
        (secondaryTimestamp && get(event.fields, secondaryTimestamp)) ??
        baseAlert[TIMESTAMP]
    );

    return {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        [ALERT_SUPPRESSION_TERMS]: suppressionTerms,
        [ALERT_SUPPRESSION_START]: suppressionTime,
        [ALERT_SUPPRESSION_END]: suppressionTime,
        [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        [ALERT_INSTANCE_ID]: instanceId,
      },
    };
  });
};
