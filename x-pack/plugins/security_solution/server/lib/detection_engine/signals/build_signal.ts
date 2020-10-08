/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { Signal, Ancestor, BaseSignalHit } from './types';

/**
 * Takes a parent signal or event document and extracts the information needed for the corresponding entry in the child
 * signal's `signal.parents` array.
 * @param doc The parent signal or event
 */
export const buildParent = (doc: BaseSignalHit): Ancestor => {
  if (doc._source.signal != null) {
    return {
      rule: doc._source.signal.rule.id,
      id: doc._id,
      type: 'signal',
      index: doc._index,
      // We first look for signal.depth and use that if it exists. If it doesn't exist, this should be a pre-7.10 signal
      // and should have signal.parent.depth instead. signal.parent.depth in this case is treated as equivalent to signal.depth.
      depth: doc._source.signal.depth ?? doc._source.signal.parent?.depth ?? 1,
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
  const existingAncestors = doc._source.signal?.ancestors;
  if (existingAncestors != null) {
    return [...existingAncestors, newAncestor];
  } else {
    return [newAncestor];
  }
};

/**
 * Builds the `signal.*` fields that are common across all signals.
 * @param docs The parent signals/events of the new signal to be built.
 * @param rule The rule that is generating the new signal.
 */
export const buildSignal = (docs: BaseSignalHit[], rule: RulesSchema): Signal => {
  const parents = docs.map(buildParent);
  const depth = parents.reduce((acc, parent) => Math.max(parent.depth, acc), 0) + 1;
  const ancestors = docs.reduce((acc: Ancestor[], doc) => acc.concat(buildAncestors(doc)), []);
  return {
    parents,
    ancestors,
    status: 'open',
    rule,
    depth,
  };
};

/**
 * Creates signal fields that are only available in the special case where a signal has only 1 parent signal/event.
 * @param doc The parent signal/event of the new signal to be built.
 */
export const additionalSignalFields = (doc: BaseSignalHit) => {
  return {
    parent: buildParent(doc),
    original_time: doc._source['@timestamp'],
    original_event: doc._source.event ?? undefined,
    threshold_count: doc._source.threshold_count ?? undefined,
  };
};
