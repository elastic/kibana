/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/core/types';
import { SignalSourceHit, SignalHit, Signal, RuleAlertAttributes, BaseSignalHit } from './types';
import { buildRule, buildRuleWithoutOverrides } from './build_rule';
import { additionalSignalFields, buildSignal } from './build_signal';
import { buildEventTypeSignal } from './build_event_type_signal';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams } from '../types';

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
    signal,
  };
};

export const buildSignalFromEvent = (
  event: BaseSignalHit,
  ruleSO: SavedObject<RuleAlertAttributes>
): SignalHit => {
  const rule = buildRuleWithoutOverrides(ruleSO);
  const signal: Signal = {
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
