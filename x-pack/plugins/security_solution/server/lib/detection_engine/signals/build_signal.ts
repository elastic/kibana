/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { INTERNAL_IDENTIFIER } from '../../../../common/constants';
import { SignalSourceHit, Signal, Ancestor } from './types';

export const buildAncestor = (doc: SignalSourceHit, rule: Partial<RulesSchema>): Ancestor => {
  const existingSignal = doc._source.signal?.parent;
  if (existingSignal != null) {
    return {
      rule: rule.id != null ? rule.id : '',
      id: doc._id,
      type: 'signal',
      index: doc._index,
      depth: existingSignal.depth + 1,
    };
  } else {
    return {
      rule: rule.id != null ? rule.id : '',
      id: doc._id,
      type: 'event',
      index: doc._index,
      depth: 1,
    };
  }
};

export const buildAncestorsSignal = (
  doc: SignalSourceHit,
  rule: Partial<RulesSchema>
): Signal['ancestors'] => {
  const newAncestor = buildAncestor(doc, rule);
  const existingAncestors = doc._source.signal?.ancestors;
  if (existingAncestors != null) {
    return [...existingAncestors, newAncestor];
  } else {
    return [newAncestor];
  }
};

export const buildSignal = (doc: SignalSourceHit, rule: Partial<RulesSchema>): Signal => {
  const ruleWithoutInternalTags = removeInternalTagsFromRule(rule);
  const parent = buildAncestor(doc, rule);
  const ancestors = buildAncestorsSignal(doc, rule);
  let signal: Signal = {
    parent,
    ancestors,
    original_time: doc._source['@timestamp'],
    status: 'open',
    rule: ruleWithoutInternalTags,
  };
  if (doc._source.event != null) {
    signal = { ...signal, original_event: doc._source.event };
  }
  if (doc._source.threshold_count != null) {
    signal = { ...signal, threshold_count: doc._source.threshold_count };
    delete doc._source.threshold_count;
  }
  return signal;
};

export const removeInternalTagsFromRule = (rule: Partial<RulesSchema>): Partial<RulesSchema> => {
  if (rule.tags == null) {
    return rule;
  } else {
    const ruleWithoutInternalTags: Partial<RulesSchema> = {
      ...rule,
      tags: rule.tags.filter((tag) => !tag.startsWith(INTERNAL_IDENTIFIER)),
    };
    return ruleWithoutInternalTags;
  }
};
