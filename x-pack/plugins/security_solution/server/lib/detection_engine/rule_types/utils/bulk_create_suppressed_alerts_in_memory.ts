/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';

import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { EqlHitsSequence } from '@elastic/elasticsearch/lib/api/types';
import {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
} from '@kbn/rule-data-utils';
import partition from 'lodash/partition';

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
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import { ALERT_ORIGINAL_TIME } from '@kbn/security-solution-plugin/common/field_maps/field_names';

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
  skipWrapping?: boolean;
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
  skipWrapping?: boolean;
}
/**
 * wraps, bulk create and suppress alerts in memory, also takes care of missing fields logic.
 * If parameter alertSuppression.missingFieldsStrategy configured not to be suppressed,
 * regular alerts will be created for such events without suppression
 */
export const bulkCreateSuppressedAlertsInMemory = async ({
  enrichedEvents,
  buildingBlockAlerts,
  skipWrapping = false,
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

  // if (suppressibleEvents?.[0]?.events != null) {
  //   // then we know that we have received sequences
  //   // so we must augment the wrapHits
  // }

  if (!suppressOnMissingFields) {
    const partitionedEvents = partitionMissingFieldsEvents(
      enrichedEvents,
      alertSuppression?.groupBy || [],
      ['fields'],
      mergeSourceAndFields
    );

    unsuppressibleWrappedDocs = wrapHits(partitionedEvents[1], buildReasonMessage);
    console.error('unsuppressible docs', unsuppressibleWrappedDocs.length);
    suppressibleEvents = partitionedEvents[0];
  }

  // refactor the below into a separate function
  const suppressibleWrappedDocs = wrapSuppressedHits(suppressibleEvents, buildReasonMessage);

  console.error(
    'SUPPRESSIBLE WRAPPED instance ids',
    suppressibleWrappedDocs.map((doc) => doc._source[ALERT_INSTANCE_ID])
  );

  // I think we create a separate bulkCreateSuppressedInMemory function
  // specifically for eql sequences
  // since sequences act differently from the other alerts.
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
  alertWithSuppression,
  alertTimestampOverride,
  experimentalFeatures,
  mergeSourceAndFields = false,
  maxNumberOfAlertsMultiplier,
}: BulkCreateSuppressedSequencesParams) => {
  const suppressOnMissingFields =
    (alertSuppression?.missingFieldsStrategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY) ===
    AlertSuppressionMissingFieldsStrategyEnum.suppress;

  let suppressibleSequences: Array<EqlHitsSequence<SignalSource>> = [];
  const unsuppressibleWrappedDocs: Array<WrappedFieldsLatest<BaseFieldsLatest>> = [];

  if (!suppressOnMissingFields) {
    sequences.forEach((sequence) => {
      // if none of the events in the given sequence
      // contain a value, then wrap sequence normally,
      // otherwise wrap as suppressed
      // ask product
      const [eventsWithFields] = partitionMissingFieldsEvents(
        sequence.events,
        alertSuppression?.groupBy || [],
        ['fields'],
        mergeSourceAndFields
      );

      if (eventsWithFields.length === 0) {
        // unsuppressible sequence alert
        const wrappedSequence = wrapSequences([sequence], buildReasonMessage);
        // console.error('UNSUPPRESSED WRAP SEQUENCE', wrappedSequence);
        unsuppressibleWrappedDocs.push(...wrappedSequence);
        console.error('unsuppressible docs', unsuppressibleWrappedDocs.length);
      } else {
        suppressibleSequences.push(sequence);
      }
    });
  } else {
    suppressibleSequences = sequences;
  }

  // refactor the below into a separate function
  const suppressibleWrappedDocs = wrapSuppressedSequences(
    suppressibleSequences,
    buildReasonMessage
  );

  // once we have wrapped thing similarly to
  // build alert group from sequence,
  // we can pass down the suppressibleWrappeDocs (our sequence alerts)
  // and the building block alerts

  // partition sequence alert from building block alerts
  const [sequenceAlerts, buildingBlockAlerts] = partition(
    suppressibleWrappedDocs,
    (signal) => signal._source[ALERT_BUILDING_BLOCK_TYPE] == null
  );

  // console.error(
  //   'SUPPRESSIBLE WRAPPED values',
  //   JSON.stringify(sequenceAlerts.map((doc) => doc._source[ALERT_SUPPRESSION_TERMS]))
  // );

  // console.error(
  //   'SUPPRESSIBLE WRAPPED original time',
  //   sequenceAlerts.map((doc) => doc._source[ALERT_ORIGINAL_TIME])
  // );

  // the code in executeBulkCreateAlerts should
  // not have to change, and might even allow me to remove
  // some of my earlier changes where the fields property was not available

  // I think we create a separate bulkCreateSuppressedInMemory function
  // specifically for eql sequences
  // since sequences act differently from the other alerts.
  return executeBulkCreateAlerts({
    suppressibleWrappedDocs: sequenceAlerts,
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
    console.error('UNSUPPRESSIBLE DOCS WRAPPED');
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
