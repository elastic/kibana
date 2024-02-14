/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';

import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  WrapSuppressedHits,
  SignalSourceHit,
} from '../types';
import { MAX_SIGNALS_SUPPRESSION_MULTIPLIER } from '../constants';
import { addToSearchAfterReturn, getSuppressionMaxSignalsWarning } from './utils';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../common/detection_engine/constants';
import { partitionMissingFieldsEvents } from './partition_missing_fields_events';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../common/api/detection_engine/model/rule_schema';
import { createEnrichEventsFunction } from './enrichments';
import { bulkCreateWithSuppression } from './bulk_create_with_suppression';

interface SearchAfterAndBulkCreateSuppressedAlertsParams extends SearchAfterAndBulkCreateParams {
  wrapSuppressedHits: WrapSuppressedHits;
  alertTimestampOverride: Date | undefined;
  alertWithSuppression: SuppressedAlertService;
  alertSuppression?: AlertSuppressionCamel;
}
export interface BulkCreateSuppressedAlertsParams
  extends Pick<
    SearchAfterAndBulkCreateSuppressedAlertsParams,
    | 'wrapHits'
    | 'bulkCreate'
    | 'services'
    | 'buildReasonMessage'
    | 'ruleExecutionLogger'
    | 'tuple'
    | 'alertSuppression'
    | 'wrapSuppressedHits'
    | 'alertWithSuppression'
    | 'alertTimestampOverride'
  > {
  enrichedEvents: SignalSourceHit[];
  toReturn: SearchAfterAndBulkCreateReturnType;
}
// TODO validate Warning cases + how to reuse this util
/**
 * bulk create and suppress alerts in memory,
 * takes care of missing fields logic, i.e. if missing fields configured not to be suppressed,
 * they will be created as regular alerts
 */
export const bulkCreateSuppressedAlertsInMemory = async ({
  enrichedEvents,
  toReturn,
  wrapHits,
  bulkCreate,
  services,
  buildReasonMessage,
  ruleExecutionLogger,
  tuple,
  alertSuppression,
  wrapSuppressedHits,
  alertWithSuppression,
  alertTimestampOverride,
}: BulkCreateSuppressedAlertsParams) => {
  // max signals for suppression includes suppressed and created alerts
  // this allows to lift max signals limitation to higher value
  // and can detects threats beyond default max_signals value
  const suppressionMaxSignals = MAX_SIGNALS_SUPPRESSION_MULTIPLIER * tuple.maxSignals;

  const suppressionDuration = alertSuppression?.duration;
  const suppressionWindow = suppressionDuration
    ? `now-${suppressionDuration.value}${suppressionDuration.unit}`
    : tuple.from.toISOString();

  const suppressOnMissingFields =
    (alertSuppression?.missingFieldsStrategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY) ===
    AlertSuppressionMissingFieldsStrategyEnum.suppress;

  let suppressibleEvents = enrichedEvents;
  if (!suppressOnMissingFields) {
    const partitionedEvents = partitionMissingFieldsEvents(
      enrichedEvents,
      alertSuppression?.groupBy || []
    );

    const wrappedDocs = wrapHits(partitionedEvents[1], buildReasonMessage);
    suppressibleEvents = partitionedEvents[0];

    const unsuppressedResult = await bulkCreate(
      wrappedDocs,
      tuple.maxSignals - toReturn.createdSignalsCount,
      createEnrichEventsFunction({
        services,
        logger: ruleExecutionLogger,
      })
    );

    addToSearchAfterReturn({ current: toReturn, next: unsuppressedResult });
  }

  const wrappedDocs = wrapSuppressedHits(suppressibleEvents, buildReasonMessage);

  const bulkCreateResult = await bulkCreateWithSuppression({
    alertWithSuppression,
    ruleExecutionLogger,
    wrappedDocs,
    services,
    suppressionWindow,
    alertTimestampOverride,
    isSuppressionPerRuleExecution: !suppressionDuration,
  });

  addToSearchAfterReturn({ current: toReturn, next: bulkCreateResult });

  const alertsWereTruncated =
    (toReturn.suppressedAlertsCount ?? 0) + toReturn.createdSignalsCount >= suppressionMaxSignals ||
    toReturn.createdSignalsCount >= tuple.maxSignals;

  // TODO validate warning cases
  console.log('alertsWereTruncated', alertsWereTruncated);
  return {
    ...bulkCreateResult,
    alertsWereTruncated,
    warningMessages: alertsWereTruncated ? getSuppressionMaxSignalsWarning() : '',
  };
};
