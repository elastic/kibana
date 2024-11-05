/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';

import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { EqlHitsSequence } from '@elastic/elasticsearch/lib/api/types';

import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  WrapSuppressedHits,
  SignalSourceHit,
  SignalSource,
  WrapSequences,
  WrapSuppressedSequences,
} from '../types';
import { MAX_SIGNALS_SUPPRESSION_MULTIPLIER } from '../constants';
import type { SequenceSuppressionTermsAndFieldsFactory } from './utils';
import { addToSearchAfterReturn } from './utils';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../common/detection_engine/constants';
import { partitionMissingFieldsEvents } from './partition_missing_fields_events';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../common/api/detection_engine/model/rule_schema';
import { createEnrichEventsFunction } from './enrichments';
import { bulkCreateWithSuppression } from './bulk_create_with_suppression';
import type { ExperimentalFeatures } from '../../../../../common';

import type {
  BaseFieldsLatest,
  EqlBuildingBlockFieldsLatest,
  EqlShellFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { AlertGroupFromSequenceBuilder } from '../eql/build_alert_group_from_sequence';

interface SearchAfterAndBulkCreateSuppressedAlertsParams extends SearchAfterAndBulkCreateParams {
  wrapSuppressedHits: WrapSuppressedHits;
  wrapSuppressedSequences: WrapSuppressedSequences;
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
  buildingBlockAlerts?: Array<WrappedFieldsLatest<BaseFieldsLatest>>;
  toReturn: SearchAfterAndBulkCreateReturnType;
  experimentalFeatures: ExperimentalFeatures;
  mergeSourceAndFields?: boolean;
  maxNumberOfAlertsMultiplier?: number;
}

export interface BulkCreateSuppressedSequencesParams
  extends Pick<
    SearchAfterAndBulkCreateSuppressedAlertsParams,
    | 'bulkCreate'
    | 'services'
    | 'buildReasonMessage'
    | 'ruleExecutionLogger'
    | 'tuple'
    | 'alertSuppression'
    | 'wrapSuppressedSequences'
    | 'alertWithSuppression'
    | 'alertTimestampOverride'
  > {
  wrapSequences: WrapSequences;
  sequences: Array<EqlHitsSequence<SignalSource>>;
  buildingBlockAlerts?: Array<WrappedFieldsLatest<BaseFieldsLatest>>;
  toReturn: SearchAfterAndBulkCreateReturnType;
  experimentalFeatures: ExperimentalFeatures;
  mergeSourceAndFields?: boolean;
  maxNumberOfAlertsMultiplier?: number;
  alertGroupFromSequenceBuilder: AlertGroupFromSequenceBuilder;
  addSequenceSuppressionTermsAndFields: SequenceSuppressionTermsAndFieldsFactory;
}
/**
 * wraps, bulk create and suppress alerts in memory, also takes care of missing fields logic.
 * If parameter alertSuppression.missingFieldsStrategy configured not to be suppressed,
 * regular alerts will be created for such events without suppression
 */
export const bulkCreateSuppressedAlertsInMemory = async ({
  enrichedEvents,
  buildingBlockAlerts,
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
  experimentalFeatures,
  mergeSourceAndFields = false,
  maxNumberOfAlertsMultiplier,
}: BulkCreateSuppressedAlertsParams) => {
  const suppressOnMissingFields =
    (alertSuppression?.missingFieldsStrategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY) ===
    AlertSuppressionMissingFieldsStrategyEnum.suppress;

  let suppressibleEvents = enrichedEvents;
  let unsuppressibleWrappedDocs: Array<WrappedFieldsLatest<BaseFieldsLatest>> = [];

  if (!suppressOnMissingFields) {
    const partitionedEvents = partitionMissingFieldsEvents(
      enrichedEvents,
      alertSuppression?.groupBy || [],
      ['fields'],
      mergeSourceAndFields
    );

    unsuppressibleWrappedDocs = wrapHits(partitionedEvents[1], buildReasonMessage);
    suppressibleEvents = partitionedEvents[0];
  }

  const suppressibleWrappedDocs = wrapSuppressedHits(suppressibleEvents, buildReasonMessage);

  return executeBulkCreateAlerts({
    suppressibleWrappedDocs,
    unsuppressibleWrappedDocs,
    buildingBlockAlerts,
    toReturn,
    bulkCreate,
    services,
    ruleExecutionLogger,
    tuple,
    alertSuppression,
    alertWithSuppression,
    alertTimestampOverride,
    experimentalFeatures,
    maxNumberOfAlertsMultiplier,
  });
};

/**
 * wraps, bulk create and suppress alerts in memory, also takes care of missing fields logic.
 * If parameter alertSuppression.missingFieldsStrategy configured not to be suppressed,
 * regular alerts will be created for such events without suppression
 */
export const bulkCreateSuppressedSequencesInMemory = async ({
  sequences,
  toReturn,
  wrapSequences,
  bulkCreate,
  services,
  buildReasonMessage,
  ruleExecutionLogger,
  tuple,
  alertSuppression,
  wrapSuppressedSequences,
  alertGroupFromSequenceBuilder,
  addSequenceSuppressionTermsAndFields,
  alertWithSuppression,
  alertTimestampOverride,
  experimentalFeatures,
  mergeSourceAndFields = false,
  maxNumberOfAlertsMultiplier,
}: BulkCreateSuppressedSequencesParams) => {
  const suppressOnMissingFields =
    (alertSuppression?.missingFieldsStrategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY) ===
    AlertSuppressionMissingFieldsStrategyEnum.suppress;

  const suppressibleWrappedSequences: Array<
    WrappedFieldsLatest<EqlShellFieldsLatest & SuppressionFieldsLatest> & {
      subAlerts: Array<WrappedFieldsLatest<EqlBuildingBlockFieldsLatest>>;
    }
  > = [];
  const unsuppressibleWrappedDocs: Array<WrappedFieldsLatest<BaseFieldsLatest>> = [];

  sequences.forEach((sequence) => {
    const alertGroupFromSequence = alertGroupFromSequenceBuilder(sequence, buildReasonMessage);
    const shellAlert = alertGroupFromSequence?.[0];
    if (shellAlert != null) {
      if (!suppressOnMissingFields) {
        const [shellAlertWithFields] = partitionMissingFieldsEvents(
          shellAlert != null ? [shellAlert] : [],
          alertSuppression?.groupBy || [],
          ['fields'],
          mergeSourceAndFields
        );

        if (shellAlertWithFields.length === 0) {
          // unsuppressible sequence alert
          // directly push alertGroup because these docs are wrapped already
          unsuppressibleWrappedDocs.push(
            ...(alertGroupFromSequence as Array<
              | WrappedFieldsLatest<EqlShellFieldsLatest>
              | WrappedFieldsLatest<EqlBuildingBlockFieldsLatest>
            >)
          );
        } else {
          const wrappedWithSuppressionTerms = addSequenceSuppressionTermsAndFields(
            shellAlert,
            alertGroupFromSequence.slice(1) as Array<
              WrappedFieldsLatest<EqlBuildingBlockFieldsLatest>
            >,
            buildReasonMessage
          );
          suppressibleWrappedSequences.push(wrappedWithSuppressionTerms);
        }
      } else {
        const wrappedWithSuppressionTerms = addSequenceSuppressionTermsAndFields(
          shellAlert,
          alertGroupFromSequence.slice(1) as Array<
            WrappedFieldsLatest<EqlBuildingBlockFieldsLatest>
          >,
          buildReasonMessage
        );
        suppressibleWrappedSequences.push(wrappedWithSuppressionTerms);
      }
    }
  });

  console.error('suppressible Sequences', suppressibleWrappedSequences.length);
  console.error('unsuppressibleWrappedDocs Sequences', unsuppressibleWrappedDocs.length);

  return executeBulkCreateAlerts({
    suppressibleWrappedDocs: suppressibleWrappedSequences,
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
    maxNumberOfAlertsMultiplier,
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
  buildingBlockAlerts?: Array<WrappedFieldsLatest<BaseFieldsLatest>>;
  toReturn: SearchAfterAndBulkCreateReturnType;
  experimentalFeatures: ExperimentalFeatures;
  maxNumberOfAlertsMultiplier?: number;
}

/**
 * creates alerts in ES, both suppressed and unsuppressed
 */
export const executeBulkCreateAlerts = async <
  T extends SuppressionFieldsLatest & BaseFieldsLatest
>({
  unsuppressibleWrappedDocs,
  suppressibleWrappedDocs,
  buildingBlockAlerts,
  toReturn,
  bulkCreate,
  services,
  ruleExecutionLogger,
  tuple,
  alertSuppression,
  alertWithSuppression,
  alertTimestampOverride,
  experimentalFeatures,
  maxNumberOfAlertsMultiplier = MAX_SIGNALS_SUPPRESSION_MULTIPLIER,
}: ExecuteBulkCreateAlertsParams<T>) => {
  // max signals for suppression includes suppressed and created alerts
  // this allows to lift max signals limitation to higher value
  // and can detects events beyond default max_signals value
  const suppressionMaxSignals = maxNumberOfAlertsMultiplier * tuple.maxSignals;
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
    buildingBlockAlerts,
    services,
    suppressionWindow,
    alertTimestampOverride,
    isSuppressionPerRuleExecution: !suppressionDuration,
    maxAlerts: tuple.maxSignals - toReturn.createdSignalsCount,
    experimentalFeatures,
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
