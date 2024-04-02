/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';

import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  WrapSuppressedHits,
  SignalSourceHit,
} from '../types';
import { MAX_SIGNALS_SUPPRESSION_MULTIPLIER } from '../constants';
import { addToSearchAfterReturn } from './utils';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../common/detection_engine/constants';
import { partitionMissingFieldsEvents } from './partition_missing_fields_events';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../common/api/detection_engine/model/rule_schema';
import { createEnrichEventsFunction } from './enrichments';
import { bulkCreateWithSuppression } from './bulk_create_with_suppression';

import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';

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
  const suppressOnMissingFields =
    (alertSuppression?.missingFieldsStrategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY) ===
    AlertSuppressionMissingFieldsStrategyEnum.suppress;

  let suppressibleEvents = enrichedEvents;
  let unsuppressibleWrappedDocs: Array<WrappedFieldsLatest<BaseFieldsLatest>> = [];

  if (!suppressOnMissingFields) {
    const partitionedEvents = partitionMissingFieldsEvents(
      enrichedEvents,
      alertSuppression?.groupBy || []
    );

    unsuppressibleWrappedDocs = wrapHits(partitionedEvents[1], buildReasonMessage);
    suppressibleEvents = partitionedEvents[0];
  }

  const suppressibleWrappedDocs = wrapSuppressedHits(suppressibleEvents, buildReasonMessage);

  return executeBulkCreateAlerts({
    suppressibleWrappedDocs,
    unsuppressibleWrappedDocs,
    toReturn,
    bulkCreate,
    services,
    ruleExecutionLogger,
    tuple,
    alertSuppression,
    alertWithSuppression,
    alertTimestampOverride,
  });
};

export interface ExecuteBulkCreateAlertsParams<T extends SuppressionFieldsLatest & BaseFieldsLatest>
  extends Pick<
    SearchAfterAndBulkCreateSuppressedAlertsParams,
    | 'bulkCreate'
    | 'services'
    | 'ruleExecutionLogger'
    | 'tuple'
    | 'alertSuppression'
    | 'alertWithSuppression'
    | 'alertTimestampOverride'
  > {
  unsuppressibleWrappedDocs: Array<WrappedFieldsLatest<BaseFieldsLatest>>;
  suppressibleWrappedDocs: Array<WrappedFieldsLatest<T>>;
  toReturn: SearchAfterAndBulkCreateReturnType;
}

/**
 * creates alerts in ES, both suppressed and unsuppressed
 */
export const executeBulkCreateAlerts = async <
  T extends SuppressionFieldsLatest & BaseFieldsLatest
>({
  unsuppressibleWrappedDocs,
  suppressibleWrappedDocs,
  toReturn,
  bulkCreate,
  services,
  ruleExecutionLogger,
  tuple,
  alertSuppression,
  alertWithSuppression,
  alertTimestampOverride,
}: ExecuteBulkCreateAlertsParams<T>) => {
  // max signals for suppression includes suppressed and created alerts
  // this allows to lift max signals limitation to higher value
  // and can detects events beyond default max_signals value
  const suppressionMaxSignals = MAX_SIGNALS_SUPPRESSION_MULTIPLIER * tuple.maxSignals;
  const suppressionDuration = alertSuppression?.duration;

  const suppressionWindow = suppressionDuration
    ? `now-${suppressionDuration.value}${suppressionDuration.unit}`
    : tuple.from.toISOString();

  if (unsuppressibleWrappedDocs.length) {
    const unsuppressedResult = await bulkCreate(
      unsuppressibleWrappedDocs,
      tuple.maxSignals - toReturn.createdSignalsCount,
      createEnrichEventsFunction({
        services,
        logger: ruleExecutionLogger,
      })
    );

    addToSearchAfterReturn({ current: toReturn, next: unsuppressedResult });
  }

  const bulkCreateResult = await bulkCreateWithSuppression({
    alertWithSuppression,
    ruleExecutionLogger,
    wrappedDocs: suppressibleWrappedDocs,
    services,
    suppressionWindow,
    alertTimestampOverride,
    isSuppressionPerRuleExecution: !suppressionDuration,
    maxAlerts: tuple.maxSignals - toReturn.createdSignalsCount,
  });

  addToSearchAfterReturn({ current: toReturn, next: bulkCreateResult });

  const alertsWereTruncated =
    (toReturn.suppressedAlertsCount ?? 0) + toReturn.createdSignalsCount >= suppressionMaxSignals ||
    toReturn.createdSignalsCount >= tuple.maxSignals;

  return {
    ...bulkCreateResult,
    alertsWereTruncated,
  };
};
