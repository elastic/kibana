/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import { Logger } from '@kbn/core/server';
import { mergeWith, isArray } from 'lodash';

import { createThreatEnrichments } from './threat_indicators';
import type { SignalSourceHit } from '../types';
import { BuildRuleMessage } from '../rule_messages';

export const enrichEvents = async ({
  services,
  logger,
  buildRuleMessage,
  events,
}: {
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
  events: SignalSourceHit[];
}) => {
  const allEventsWithEnrichments = await Promise.all([
    // createThreatEnrichments({
    //   services,
    //   logger,
    //   buildRuleMessage,
    //   events,
    //   threatIndex: ['filebeat*'],
    //   threatIndicatorPath: 'threat.indicator',
    // }),
    createThreatEnrichments({
      services,
      logger,
      buildRuleMessage,
      events,
      threatIndex: ['threat-indicator'],
      threatIndicatorPath: 'threat.indicator',
    }),
  ]);

  const eventsMap: { [key: string]: SignalSourceHit[] } = {};
  allEventsWithEnrichments.forEach((enrichedEvents: SignalSourceHit[] | undefined) => {
    enrichedEvents?.forEach((signal: SignalSourceHit) => {
      if (!eventsMap[signal._id]) {
        eventsMap[signal._id] = [];
      }
      eventsMap[signal._id].push(signal);
    });
  });

  const enrichedMergedEvents: SignalSourceHit[] = [];
  Object.keys(eventsMap).forEach((id) => {
    const eventsById = eventsMap[id];
    // TODO: Does merge ok for us here?
    const mergedEvent: SignalSourceHit | null = eventsById.reduce(
      (acc, val) =>
        mergeWith(acc, val, (objValue, srcValue) => {
          if (isArray(objValue)) {
            return objValue.concat(srcValue);
          }
        }),
      null
    );
    if (mergedEvent) enrichedMergedEvents.push(mergedEvent);
  });

  return enrichedMergedEvents;
};
