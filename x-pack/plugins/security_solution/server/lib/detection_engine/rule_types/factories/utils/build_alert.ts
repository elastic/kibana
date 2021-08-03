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
import { Ancestor, BaseSignalHit, SimpleHit, ThresholdResult } from '../../../signals/types';
import {
  getF,
  getValidDateFromDoc,
  isWrappedRACAlert,
  isWrappedSignalHit,
} from '../../../signals/utils';
import { invariant } from '../../../../../../common/utils/invariant';
import { DEFAULT_MAX_SIGNALS } from '../../../../../../common/constants';
import { RACAlert } from '../../types';

/**
 * Takes an event document and extracts the information needed for the corresponding entry in the child
 * alert's ancestors array.
 * @param doc The parent event
 */
export const buildParent = (doc: SimpleHit): Ancestor => {
  const isSignal = isWrappedSignalHit(doc) || isWrappedRACAlert(doc);
  const parent: Ancestor = {
    id: doc._id,
    type: isSignal ? 'signal' : 'event',
    index: doc._index,
    depth: (isSignal ? getF(doc, 'signal.depth') : getF(doc, 'signal.parent.depth')) ?? 0,
  };
  if (isSignal) {
    parent.rule = getF(doc, 'signal.rule.id');
  }
  return parent;
};

/**
 * Takes a parent event document with N ancestors and adds the parent document to the ancestry array,
 * creating an array of N+1 ancestors.
 * @param doc The parent event for which to extend the ancestry.
 */
export const buildAncestors = (doc: SimpleHit): Ancestor[] => {
  const newAncestor = buildParent(doc);
  if (newAncestor != null) {
    const existingAncestors: Ancestor[] | undefined = getF(doc, 'signal.ancestors');
    if (existingAncestors != null) {
      return [...existingAncestors, newAncestor];
    } else {
      return [newAncestor];
    }
  }
  return [];
};

/**
 * This removes any alert name clashes such as if a source index has
 * "signal" but is not a signal object we put onto the object. If this
 * is our "signal object" then we don't want to remove it.
 * @param doc The source index doc to a signal.
 */
export const removeClashes = (doc: SimpleHit) => {
  if (isWrappedSignalHit(doc)) {
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
  }
  return doc;
};

/**
 * Builds the `kibana.alert.*` fields that are common across all alerts.
 * @param docs The parent alerts/events of the new alert to be built.
 * @param rule The rule that is generating the new alert.
 */
export const buildAlert = (docs: SimpleHit[], rule: RulesSchema): RACAlert => {
  const removedClashes = docs.map(removeClashes);
  const parents = removedClashes.map(buildParent).filter((parent) => parent != null) as Ancestor[];
  const depth = parents.reduce((acc, parent) => Math.max(parent.depth, acc), 0) + 1;
  const ancestors = removedClashes.reduce(
    (acc: Ancestor[], doc) => acc.concat(buildAncestors(doc)),
    []
  );

  return {
    '@timestamp': new Date().toISOString(),
    'kibana.alert.ancestors': ancestors as object[],
    [ALERT_STATUS]: 'open',
    [ALERT_WORKFLOW_STATUS]: 'open',
    'kibana.alert.depth': depth,
    'kibana.alert.rule.false_positives': rule.false_positives ?? [],
    'kibana.alert.rule.id': rule.id,
    'kibana.alert.rule.immutable': rule.immutable ? 'true' : 'false',
    'kibana.alert.rule.index': rule.index ?? [],
    'kibana.alert.rule.language': rule.language ?? 'kuery',
    'kibana.alert.rule.max_signals': rule.max_signals ?? DEFAULT_MAX_SIGNALS,
    'kibana.alert.rule.query': rule.query ?? '*:*',
    'kibana.alert.rule.saved_id': rule.saved_id ?? '',
    'kibana.alert.rule.threat_index': rule.threat_index,
    'kibana.alert.rule.threat_indicator_path': rule.threat_indicator_path,
    'kibana.alert.rule.threat_language': rule.threat_language,
    'kibana.alert.rule.threat_mapping.field': '', // TODO
    'kibana.alert.rule.threat_mapping.value': '', // TODO
    'kibana.alert.rule.threat_mapping.type': '', // TODO
    'kibana.alert.rule.threshold.field': rule.threshold?.field,
    'kibana.alert.rule.threshold.value': rule.threshold?.value,
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
