/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { SignalSourceHit, Signal, Ancestor } from './types';

export const buildParent = (doc: SignalSourceHit): Ancestor => {
  if (doc._source.signal != null) {
    return {
      rule: doc._source.signal.rule.id,
      id: doc._id,
      type: 'signal',
      index: doc._index,
      depth: doc._source.signal.depth,
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

export const buildAncestorsSignal = (doc: SignalSourceHit): Signal['ancestors'] => {
  const newAncestor = buildParent(doc);
  const existingAncestors = doc._source.signal?.ancestors;
  if (existingAncestors != null) {
    return [...existingAncestors, newAncestor];
  } else {
    return [newAncestor];
  }
};

export const buildSignal = (docs: SignalSourceHit[], rule: Partial<RulesSchema>): Signal => {
  const depth = docs.reduce((acc, doc) => Math.max(doc._source.signal?.depth ?? 0, acc), 0) + 1;
  const parents = docs.map(buildParent);
  const ancestors = docs.reduce(
    (acc: Ancestor[], doc) => acc.concat(buildAncestorsSignal(doc)),
    []
  );
  return {
    parents,
    ancestors,
    status: 'open',
    rule,
    depth,
  };
};

export const additionalSignalFields = (doc: SignalSourceHit) => {
  return {
    original_time: doc._source['@timestamp'],
    original_event: doc._source.event ?? undefined,
    threshold_count: doc._source.threshold_count ?? undefined,
  };
};
