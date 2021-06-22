/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'src/core/types';
import { getMergeStrategy } from './source_fields_merging/strategies';
import {
  AlertAttributes,
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

/**
 * Formats the search_after result for insertion into the signals index. We first create a
 * "best effort" merged "fields" with the "_source" object, then build the signal object,
 * then the event object, and finally we strip away any additional temporary data that was added
 * such as the "threshold_result".
 * @param ruleSO The rule saved object to build overrides
 * @param doc The SignalSourceHit with "_source", "fields", and additional data such as "threshold_result"
 * @returns The body that can be added to a bulk call for inserting the signal.
 */
export const buildBulkBody = (
  ruleSO: SavedObject<AlertAttributes>,
  doc: SignalSourceHit,
  mergeStrategy: ConfigType['alertMergeStrategy']
): SignalHit => {
  const mergedDoc = getMergeStrategy(mergeStrategy)({ doc });
  const rule = buildRuleWithOverrides(ruleSO, mergedDoc._source ?? {});
  const signal: Signal = {
    ...buildSignal([mergedDoc], rule),
    ...additionalSignalFields(mergedDoc),
  };
  const event = buildEventTypeSignal(mergedDoc);
  const { threshold_result: thresholdResult, ...filteredSource } = mergedDoc._source || {
    threshold_result: null,
  };
  const signalHit: SignalHit = {
    ...filteredSource,
    '@timestamp': new Date().toISOString(),
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
 * @param ruleSO SavedObject representing the rule that found the sequence
 * @param outputIndex Index to write the resulting signals to
 */
export const buildSignalGroupFromSequence = (
  sequence: EqlSequence<SignalSource>,
  ruleSO: SavedObject<AlertAttributes>,
  outputIndex: string,
  mergeStrategy: ConfigType['alertMergeStrategy']
): WrappedSignalHit[] => {
  const wrappedBuildingBlocks = wrapBuildingBlocks(
    sequence.events.map((event) => {
      const signal = buildSignalFromEvent(event, ruleSO, false, mergeStrategy);
      signal.signal.rule.building_block_type = 'default';
      return signal;
    }),
    outputIndex
  );

  if (
    wrappedBuildingBlocks.some((block) =>
      block._source.signal?.ancestors.some((ancestor) => ancestor.rule === ruleSO.id)
    )
  ) {
    return [];
  }

  // Now that we have an array of building blocks for the events in the sequence,
  // we can build the signal that links the building blocks together
  // and also insert the group id (which is also the "shell" signal _id) in each building block
  const sequenceSignal = wrapSignal(
    buildSignalFromSequence(wrappedBuildingBlocks, ruleSO),
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
  ruleSO: SavedObject<AlertAttributes>
): SignalHit => {
  const rule = buildRuleWithoutOverrides(ruleSO);
  const signal: Signal = buildSignal(events, rule, ruleSO.attributes.consumer);
  const mergedEvents = objectArrayIntersection(events.map((event) => event._source));
  return {
    ...mergedEvents,
    '@timestamp': new Date().toISOString(),
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
  ruleSO: SavedObject<AlertAttributes>,
  applyOverrides: boolean,
  mergeStrategy: ConfigType['alertMergeStrategy']
): SignalHit => {
  const mergedEvent = getMergeStrategy(mergeStrategy)({ doc: event });
  const rule = applyOverrides
    ? buildRuleWithOverrides(ruleSO, mergedEvent._source ?? {})
    : buildRuleWithoutOverrides(ruleSO);
  const signal: Signal = {
    ...buildSignal([mergedEvent], rule),
    ...additionalSignalFields(mergedEvent),
  };
  const eventFields = buildEventTypeSignal(mergedEvent);
  // TODO: better naming for SignalHit - it's really a new signal to be inserted
  const signalHit: SignalHit = {
    ...mergedEvent._source,
    '@timestamp': new Date().toISOString(),
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
