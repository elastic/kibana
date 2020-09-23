/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/core/types';
import {
  SignalSourceHit,
  SignalHit,
  Signal,
  RuleAlertAttributes,
  BaseSignalHit,
  SignalSource,
} from './types';
import { buildRule, buildRuleWithoutOverrides } from './build_rule';
import { additionalSignalFields, buildSignal } from './build_signal';
import { buildEventTypeSignal } from './build_event_type_signal';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams } from '../types';
import { generateSignalId, wrapBuildingBlocks, wrapSignal } from './utils';
import { EqlSequence } from '../../types';

interface BuildBulkBodyParams {
  doc: SignalSourceHit;
  ruleParams: RuleTypeParams;
  id: string;
  actions: RuleAlertAction[];
  name: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  interval: string;
  enabled: boolean;
  tags: string[];
  throttle: string;
}

// format search_after result for signals index.
export const buildBulkBody = ({
  doc,
  ruleParams,
  id,
  name,
  actions,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  interval,
  enabled,
  tags,
  throttle,
}: BuildBulkBodyParams): SignalHit => {
  const rule = buildRule({
    actions,
    ruleParams,
    id,
    name,
    enabled,
    createdAt,
    createdBy,
    doc,
    updatedAt,
    updatedBy,
    interval,
    tags,
    throttle,
  });
  const signal: Signal = {
    ...buildSignal([doc], rule),
    ...additionalSignalFields(doc),
  };
  const event = buildEventTypeSignal(doc);
  const signalHit: SignalHit = {
    ...doc._source,
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
  ruleSO: SavedObject<RuleAlertAttributes>,
  outputIndex: string
): BaseSignalHit[] => {
  const wrappedBuildingBlocks = wrapBuildingBlocks(
    sequence.events.map((event) => {
      const signal = buildSignalFromEvent(event, ruleSO);
      signal.signal.rule.building_block_type = 'default';
      return signal;
    }),
    outputIndex
  );

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
  events: BaseSignalHit[],
  ruleSO: SavedObject<RuleAlertAttributes>
): SignalHit => {
  const rule = buildRuleWithoutOverrides(ruleSO);
  const signal: Signal = buildSignal(events, rule);
  return {
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
  ruleSO: SavedObject<RuleAlertAttributes>
): SignalHit => {
  const rule = buildRuleWithoutOverrides(ruleSO);
  const signal = {
    ...buildSignal([event], rule),
    ...additionalSignalFields(event),
  };
  const eventFields = buildEventTypeSignal(event);
  // TODO: better naming for SignalHit - it's really a new signal to be inserted
  const signalHit: SignalHit = {
    ...event._source,
    '@timestamp': new Date().toISOString(),
    event: eventFields,
    signal,
  };
  return signalHit;
};
