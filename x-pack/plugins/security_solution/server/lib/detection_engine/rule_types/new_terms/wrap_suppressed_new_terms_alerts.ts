/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pick from 'lodash/pick';
import get from 'lodash/get';
import sortBy from 'lodash/sortBy';

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import objectHash from 'object-hash';
import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type {
  BaseFieldsLatest,
  NewTermsFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import { ALERT_NEW_TERMS } from '../../../../../common/field_maps/field_names';
import type { ConfigType } from '../../../../config';
import type { CompleteRule, NewTermsRuleParams } from '../../rule_schema';
import { buildReasonMessageForNewTermsAlert } from '../utils/reason_formatters';
import type { SignalSource } from '../types';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { buildBulkBody } from '../factories/utils/build_bulk_body';

export interface EventsAndTerms {
  event: estypes.SearchHit<SignalSource>;
  newTerms: Array<string | number | null>;
}

export const wrapSuppressedNewTermsAlerts = ({
  eventsAndTerms,
  spaceId,
  completeRule,
  mergeStrategy,
  indicesToQuery,
  alertTimestampOverride,
  ruleExecutionLogger,
  publicBaseUrl,
  primaryTimestamp,
  secondaryTimestamp,
}: {
  eventsAndTerms: EventsAndTerms[];
  spaceId: string | null | undefined;
  completeRule: CompleteRule<NewTermsRuleParams>;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  indicesToQuery: string[];
  alertTimestampOverride: Date | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  publicBaseUrl: string | undefined;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
}): Array<WrappedFieldsLatest<NewTermsFieldsLatest & SuppressionFieldsLatest>> => {
  const suppressedBy = completeRule?.ruleParams?.alertSuppression?.groupBy ?? [];

  return eventsAndTerms.map((eventAndTerms) => {
    const event = eventAndTerms.event;

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
      eventAndTerms.event._index,
      eventAndTerms.event._id,
      String(eventAndTerms.event._version),
      `${spaceId}:${completeRule.alertId}`,
      eventAndTerms.newTerms,
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
      buildReasonMessageForNewTermsAlert,
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
        [ALERT_NEW_TERMS]: eventAndTerms.newTerms,
        [ALERT_SUPPRESSION_TERMS]: suppressionTerms,
        [ALERT_SUPPRESSION_START]: suppressionTime,
        [ALERT_SUPPRESSION_END]: suppressionTime,
        [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        [ALERT_INSTANCE_ID]: instanceId,
      },
    };
  });
};
