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
} from '../types';

import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../common/detection_engine/constants';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../common/api/detection_engine/model/rule_schema';

import { executeBulkCreateAlerts } from '../utils/bulk_create_suppressed_alerts_in_memory';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
  NewTermsFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import { partitionMissingFieldsEvents } from '../utils/partition_missing_fields_events';
import type { EventsAndTerms } from './types';
import type { ExperimentalFeatures } from '../../../../../common';

interface SearchAfterAndBulkCreateSuppressedAlertsParams extends SearchAfterAndBulkCreateParams {
  wrapSuppressedHits: WrapSuppressedHits;
  alertTimestampOverride: Date | undefined;
  alertWithSuppression: SuppressedAlertService;
  alertSuppression?: AlertSuppressionCamel;
}
export interface BulkCreateSuppressedAlertsParams
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
  wrapHits: (
    events: EventsAndTerms[]
  ) => Array<WrappedFieldsLatest<BaseFieldsLatest & NewTermsFieldsLatest>>;
  wrapSuppressedHits: (
    events: EventsAndTerms[]
  ) => Array<
    WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest & NewTermsFieldsLatest>
  >;
  eventsAndTerms: EventsAndTerms[];
  toReturn: SearchAfterAndBulkCreateReturnType;
  experimentalFeatures: ExperimentalFeatures;
}
/**
 * wraps, bulk create and suppress alerts in memory, also takes care of missing fields logic.
 * If parameter alertSuppression.missingFieldsStrategy configured not to be suppressed, regular alerts will be created for such events without suppression
 * This function is similar to x-pack/plugins/security_solution/server/lib/detection_engine/rule_types/utils/bulk_create_suppressed_alerts_in_memory.ts, but
 * it operates with new terms specific eventsAndTerms{@link EventsAndTerms} parameter property, instead of regular events as common utility
 */
export const bulkCreateSuppressedNewTermsAlertsInMemory = async ({
  eventsAndTerms,
  wrapHits,
  wrapSuppressedHits,
  toReturn,
  bulkCreate,
  services,
  ruleExecutionLogger,
  tuple,
  alertSuppression,
  alertWithSuppression,
  alertTimestampOverride,
  experimentalFeatures,
}: BulkCreateSuppressedAlertsParams) => {
  const suppressOnMissingFields =
    (alertSuppression?.missingFieldsStrategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY) ===
    AlertSuppressionMissingFieldsStrategyEnum.suppress;

  let suppressibleEvents = eventsAndTerms;
  let unsuppressibleWrappedDocs: Array<WrappedFieldsLatest<BaseFieldsLatest>> = [];

  if (!suppressOnMissingFields) {
    const partitionedEvents = partitionMissingFieldsEvents(
      eventsAndTerms,
      alertSuppression?.groupBy || [],
      ['event']
    );

    unsuppressibleWrappedDocs = wrapHits(partitionedEvents[1]);

    suppressibleEvents = partitionedEvents[0];
  }

  const suppressibleWrappedDocs = wrapSuppressedHits(suppressibleEvents);

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
    experimentalFeatures,
  });
};
