/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_STATUS, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { SearchTypes } from '../../../../../../common/detection_engine/types';
import { RulesSchema } from '../../../../../../common/detection_engine/schemas/response/rules_schema';
import { isEventTypeSignal } from '../../../signals/build_event_type_signal';
import {
  Ancestor,
  BaseSignalHit,
  SignalHit,
  SignalSourceHit,
  ThresholdResult,
} from '../../../signals/types';
import { getValidDateFromDoc } from '../../../signals/utils';
import { invariant } from '../../../../../../common/utils/invariant';
import { DEFAULT_MAX_SIGNALS } from '../../../../../../common/constants';

/**
 * Takes a parent signal or event document and extracts the information needed for the corresponding entry in the child
 * signal's `signal.parents` array.
 * @param doc The parent signal or event
 */
export const buildParent = (doc: BaseSignalHit): Ancestor => {
  if (doc._source?.signal != null) {
    return {
      rule: doc._source?.signal.rule.id,
      id: doc._id,
      type: 'signal',
      index: doc._index,
      // We first look for signal.depth and use that if it exists. If it doesn't exist, this should be a pre-7.10 signal
      // and should have signal.parent.depth instead. signal.parent.depth in this case is treated as equivalent to signal.depth.
      depth: doc._source?.signal.depth ?? doc._source?.signal.parent?.depth ?? 1,
    };
  } else {
    return {
      id: doc._id,
      type: 'event',
      index: doc._index,
      depth: 0,
    };
  }
};

/**
 * Takes a parent signal or event document with N ancestors and adds the parent document to the ancestry array,
 * creating an array of N+1 ancestors.
 * @param doc The parent signal/event for which to extend the ancestry.
 */
export const buildAncestors = (doc: BaseSignalHit): Ancestor[] => {
  const newAncestor = buildParent(doc);
  const existingAncestors = doc._source?.signal?.ancestors;
  if (existingAncestors != null) {
    return [...existingAncestors, newAncestor];
  } else {
    return [newAncestor];
  }
};

/**
 * This removes any signal name clashes such as if a source index has
 * "signal" but is not a signal object we put onto the object. If this
 * is our "signal object" then we don't want to remove it.
 * @param doc The source index doc to a signal.
 */
export const removeClashes = (doc: BaseSignalHit): BaseSignalHit => {
  invariant(doc._source, '_source field not found');
  const { signal, ...noSignal } = doc._source;
  if (signal == null || isEventTypeSignal(doc)) {
    return doc;
  } else {
    return {
      ...doc,
      _source: { ...noSignal },
    };
  }
};

/**
 * Builds the `signal.*` fields that are common across all signals.
 * @param docs The parent signals/events of the new signal to be built.
 * @param rule The rule that is generating the new signal.
 */
export const buildAlert = (doc: SignalSourceHit, rule: RulesSchema) => {
  const removedClashes = removeClashes(doc);
  const parent = buildParent(removedClashes);
  const ancestors = buildAncestors(removedClashes);
  const immutable = doc._source?.signal?.rule.immutable ? 'true' : 'false';

  const source = doc._source as SignalHit;
  const signal = source?.signal;
  const signalRule = signal?.rule;

  return {
    'kibana.alert.ancestors': ancestors as object[],
    [ALERT_STATUS]: 'open',
    [ALERT_WORKFLOW_STATUS]: 'open',
    'kibana.alert.depth': parent.depth,
    'kibana.alert.rule.false_positives': signalRule?.false_positives ?? [],
    'kibana.alert.rule.id': rule.id,
    'kibana.alert.rule.immutable': immutable,
    'kibana.alert.rule.index': signalRule?.index ?? [],
    'kibana.alert.rule.language': signalRule?.language ?? 'kuery',
    'kibana.alert.rule.max_signals': signalRule?.max_signals ?? DEFAULT_MAX_SIGNALS,
    'kibana.alert.rule.query': signalRule?.query ?? '*:*',
    'kibana.alert.rule.saved_id': signalRule?.saved_id ?? '',
    'kibana.alert.rule.threat_index': signalRule?.threat_index,
    'kibana.alert.rule.threat_indicator_path': signalRule?.threat_indicator_path,
    'kibana.alert.rule.threat_language': signalRule?.threat_language,
    'kibana.alert.rule.threat_mapping.field': '', // TODO
    'kibana.alert.rule.threat_mapping.value': '', // TODO
    'kibana.alert.rule.threat_mapping.type': '', // TODO
    'kibana.alert.rule.threshold.field': signalRule?.threshold?.field,
    'kibana.alert.rule.threshold.value': signalRule?.threshold?.value,
    'kibana.alert.rule.threshold.cardinality.field': '', // TODO
    'kibana.alert.rule.threshold.cardinality.value': 0, // TODO
  };
};

const isThresholdResult = (thresholdResult: SearchTypes): thresholdResult is ThresholdResult => {
  return typeof thresholdResult === 'object';
};

/**
 * Creates signal fields that are only available in the special case where a signal has only 1 parent signal/event.
 * We copy the original time from the document as "original_time" since we override the timestamp with the current date time.
 * @param doc The parent signal/event of the new signal to be built.
 */
export const additionalAlertFields = (doc: BaseSignalHit) => {
  const thresholdResult = doc._source?.threshold_result;
  if (thresholdResult != null && !isThresholdResult(thresholdResult)) {
    throw new Error(`threshold_result failed to validate: ${thresholdResult}`);
  }
  const originalTime = getValidDateFromDoc({
    doc,
    timestampOverride: undefined,
  });
  return {
    'kibana.alert.original_time': originalTime != null ? originalTime.toISOString() : undefined,
    'kibana.alert.original_event': doc._source?.event ?? undefined,
    'kibana.alert.threshold_result': thresholdResult,
  };
};
