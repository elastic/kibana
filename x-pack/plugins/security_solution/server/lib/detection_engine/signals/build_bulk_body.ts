/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP } from '@kbn/rule-data-utils';
import { getMergeStrategy } from './source_fields_merging/strategies';
import {
  SignalSourceHit,
  SignalHit,
  Signal,
  BaseSignalHit,
  SignalSource,
  WrappedSignalHit,
} from './types';
import { buildRuleWithoutOverrides, buildRuleWithOverrides } from './build_rule';
import { additionalSignalFields, buildSignal } from './build_signal';
import { buildEventTypeSignal } from './build_event_type_signal';
import { EqlSequence } from '../../../../common/detection_engine/types';
import { generateSignalId, wrapBuildingBlocks, wrapSignal } from './utils';
import type { ConfigType } from '../../../config';
import { BuildReasonMessage } from './reason_formatters';
import { CompleteRule, RuleParams } from '../schemas/rule_schemas';

/**
 * Formats the search_after result for insertion into the signals index. We first create a
 * "best effort" merged "fields" with the "_source" object, then build the signal object,
 * then the event object, and finally we strip away any additional temporary data that was added
 * such as the "threshold_result".
 * @param completeRule The rule  object to build overrides
 * @param doc The SignalSourceHit with "_source", "fields", and additional data such as "threshold_result"
 * @returns The body that can be added to a bulk call for inserting the signal.
 */
export const buildBulkBody = (
  completeRule: CompleteRule<RuleParams>,
  doc: SignalSourceHit,
  mergeStrategy: ConfigType['alertMergeStrategy'],
  ignoreFields: ConfigType['alertIgnoreFields'],
  buildReasonMessage: BuildReasonMessage
): SignalHit => {
  const mergedDoc = getMergeStrategy(mergeStrategy)({ doc, ignoreFields });
  const rule = buildRuleWithOverrides(completeRule, mergedDoc._source ?? {});
  const timestamp = new Date().toISOString();
  const reason = buildReasonMessage({
    name: completeRule.ruleConfig.name,
    severity: completeRule.ruleParams.severity,
    mergedDoc,
  });
  const signal: Signal = {
    ...buildSignal([mergedDoc], rule, reason),
    ...additionalSignalFields(mergedDoc),
  };
  const event = buildEventTypeSignal(mergedDoc);
  // Filter out any kibana.* fields from the generated signal - kibana.* fields are aliases
  // in siem-signals so we can't write to them, but for signals-on-signals they'll be returned
  // in the fields API response and merged into the mergedDoc source
  const {
    threshold_result: thresholdResult,
    kibana,
    ...filteredSource
  } = mergedDoc._source || {
    threshold_result: null,
  };
  const signalHit: SignalHit = {
    ...filteredSource,
    [TIMESTAMP]: timestamp,
    event,
    signal,
  };
  return signalHit;
};

/**
 * Takes N raw documents from ES that form a sequence and builds them into N+1 signals ready to be indexed -
 * one signal for each event in the sequence, and a "shell" signal that ties them all together. All N+1 signals
 * share the same signal.group.id to make it easy to query them.
 * @param sequence The raw ES documents that make up the sequence
 * @param completeRule rule object representing the rule that found the sequence
 * @param outputIndex Index to write the resulting signals to
 */
export const buildSignalGroupFromSequence = (
  sequence: EqlSequence<SignalSource>,
  completeRule: CompleteRule<RuleParams>,
  outputIndex: string,
  mergeStrategy: ConfigType['alertMergeStrategy'],
  ignoreFields: ConfigType['alertIgnoreFields'],
  buildReasonMessage: BuildReasonMessage
): WrappedSignalHit[] => {
  const wrappedBuildingBlocks = wrapBuildingBlocks(
    sequence.events.map((event) => {
      const signal = buildSignalFromEvent(
        event,
        completeRule,
        false,
        mergeStrategy,
        ignoreFields,
        buildReasonMessage
      );
      signal.signal.rule.building_block_type = 'default';
      return signal;
    }),
    outputIndex
  );

  if (
    wrappedBuildingBlocks.some((block) =>
      block._source.signal?.ancestors.some((ancestor) => ancestor.rule === completeRule.alertId)
    )
  ) {
    return [];
  }

  // Now that we have an array of building blocks for the events in the sequence,
  // we can build the signal that links the building blocks together
  // and also insert the group id (which is also the "shell" signal _id) in each building block
  const sequenceSignal = wrapSignal(
    buildSignalFromSequence(wrappedBuildingBlocks, completeRule, buildReasonMessage),
    outputIndex
  );
  wrappedBuildingBlocks.forEach((block, idx) => {
    // TODO: fix type of blocks so we don't have to check existence of _source.signal
    if (block._source.signal) {
      block._source.signal.group = {
        id: sequenceSignal._id,
        index: idx,
      };
    }
  });
  return [...wrappedBuildingBlocks, sequenceSignal];
};

export const buildSignalFromSequence = (
  events: WrappedSignalHit[],
  completeRule: CompleteRule<RuleParams>,
  buildReasonMessage: BuildReasonMessage
): SignalHit => {
  const rule = buildRuleWithoutOverrides(completeRule);
  const timestamp = new Date().toISOString();
  const mergedEvents = objectArrayIntersection(events.map((event) => event._source));
  const reason = buildReasonMessage({
    name: completeRule.ruleConfig.name,
    severity: completeRule.ruleParams.severity,
    mergedDoc: mergedEvents as SignalSourceHit,
  });
  const signal: Signal = buildSignal(events, rule, reason);
  return {
    ...mergedEvents,
    [TIMESTAMP]: timestamp,
    event: {
      kind: 'signal',
    },
    signal: {
      ...signal,
      group: {
        // This is the same function that is used later to generate the _id for the sequence signal document,
        // so _id should equal signal.group.id for the "shell" document
        id: generateSignalId(signal),
      },
    },
  };
};

export const buildSignalFromEvent = (
  event: BaseSignalHit,
  completeRule: CompleteRule<RuleParams>,
  applyOverrides: boolean,
  mergeStrategy: ConfigType['alertMergeStrategy'],
  ignoreFields: ConfigType['alertIgnoreFields'],
  buildReasonMessage: BuildReasonMessage
): SignalHit => {
  const mergedEvent = getMergeStrategy(mergeStrategy)({ doc: event, ignoreFields });
  const rule = applyOverrides
    ? buildRuleWithOverrides(completeRule, mergedEvent._source ?? {})
    : buildRuleWithoutOverrides(completeRule);
  const timestamp = new Date().toISOString();
  const reason = buildReasonMessage({
    name: completeRule.ruleConfig.name,
    severity: completeRule.ruleParams.severity,
    mergedDoc: mergedEvent,
  });
  const signal: Signal = {
    ...buildSignal([mergedEvent], rule, reason),
    ...additionalSignalFields(mergedEvent),
  };
  const eventFields = buildEventTypeSignal(mergedEvent);
  // Filter out any kibana.* fields from the generated signal - kibana.* fields are aliases
  // in siem-signals so we can't write to them, but for signals-on-signals they'll be returned
  // in the fields API response and merged into the mergedDoc source
  const { kibana, ...filteredSource } = mergedEvent._source || {};
  // TODO: better naming for SignalHit - it's really a new signal to be inserted
  const signalHit: SignalHit = {
    ...filteredSource,
    [TIMESTAMP]: timestamp,
    event: eventFields,
    signal,
  };
  return signalHit;
};

export const objectArrayIntersection = (objects: object[]) => {
  if (objects.length === 0) {
    return undefined;
  } else if (objects.length === 1) {
    return objects[0];
  } else {
    return objects
      .slice(1)
      .reduce(
        (acc: object | undefined, obj): object | undefined => objectPairIntersection(acc, obj),
        objects[0]
      );
  }
};

export const objectPairIntersection = (a: object | undefined, b: object | undefined) => {
  if (a === undefined || b === undefined) {
    return undefined;
  }
  const intersection: Record<string, unknown> = {};
  Object.entries(a).forEach(([key, aVal]) => {
    if (key in b) {
      const bVal = (b as Record<string, unknown>)[key];
      if (
        typeof aVal === 'object' &&
        !(aVal instanceof Array) &&
        aVal !== null &&
        typeof bVal === 'object' &&
        !(bVal instanceof Array) &&
        bVal !== null
      ) {
        intersection[key] = objectPairIntersection(aVal, bVal);
      } else if (aVal === bVal) {
        intersection[key] = aVal;
      }
    }
  });
  // Count up the number of entries that are NOT undefined in the intersection
  // If there are no keys OR all entries are undefined, return undefined
  if (
    Object.values(intersection).reduce(
      (acc: number, value) => (value !== undefined ? acc + 1 : acc),
      0
    ) === 0
  ) {
    return undefined;
  } else {
    return intersection;
  }
};
