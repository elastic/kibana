/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';

import { bulkCreateWithSuppression } from './bulk_create_with_suppression';
import { addToSearchAfterReturn, getSuppressionMaxSignalsWarning } from './utils';
import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  WrapSuppressedHits,
} from '../types';
import { MAX_SIGNALS_SUPPRESSION_MULTIPLIER } from '../constants';

import { createEnrichEventsFunction } from './enrichments';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../common/api/detection_engine/model/rule_schema';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../common/detection_engine/constants';
import { partitionMissingFieldsEvents } from './partition_missing_fields_events';
interface SearchAfterAndBulkCreateSuppressedAlertsParams extends SearchAfterAndBulkCreateParams {
  wrapSuppressedHits: WrapSuppressedHits;
  alertTimestampOverride: Date | undefined;
  alertWithSuppression: SuppressedAlertService;
  alertSuppression?: AlertSuppressionCamel;
}

import type { SearchAfterAndBulkCreateFactoryParams } from './search_after_bulk_create_factory';
import { searchAfterAndBulkCreateFactory } from './search_after_bulk_create_factory';

/**
 * search_after through documents and re-index using bulk endpoint
 * and suppress alerts
 */
export const searchAfterAndBulkCreateSuppressedAlerts = async (
  params: SearchAfterAndBulkCreateSuppressedAlertsParams
): Promise<SearchAfterAndBulkCreateReturnType> => {
  const {
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
  } = params;

  const bulkCreateExecutor: SearchAfterAndBulkCreateFactoryParams['bulkCreateExecutor'] = async ({
    enrichedEvents,
    toReturn,
  }) => {
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

    return {
      ...bulkCreateResult,
      alertsWereTruncated:
        (toReturn.suppressedAlertsCount ?? 0) + toReturn.createdSignalsCount >=
          suppressionMaxSignals || toReturn.createdSignalsCount >= tuple.maxSignals,
    };
  };

  return searchAfterAndBulkCreateFactory({
    ...params,
    bulkCreateExecutor,
    getWarningMessage: getSuppressionMaxSignalsWarning,
  });
};
